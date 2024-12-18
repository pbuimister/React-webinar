class JobsController < ApplicationController
  include JobIndexFilters
  before_action :set_job, only: %i[show edit update destroy job_data_cell_contents]
  helper_method :sort_column, :sort_direction
  js :new, only: %i[new edit create update]

  def index
    authorize Job
    @account = current_user.account

    _jobs = policy_scope(@account.jobs
                                 .left_outer_joins(job_column_values: :job_column)
                                 .joins(:job_status)
                                 .select('jobs.*, settings_job_statuses.name as job_status_name')
                                 .distinct)

    _jobs = job_index_filters(_jobs, params)

    inline_params

    _jobs = _jobs.includes(:job_comments, :job_status_changes, :requesters, :assignees, :coordinators, :technicians)
                 .order("#{sort_column} #{sort_direction}")

    _jobs = _jobs.rank(:board_order).all if params[:traits]&.include?('board')

    @jobs = _jobs.page(params[:page]).per(25)

    respond_to do |format|
      format.html
      format.json
    end
  end

  def show
    authorize @job
    respond_to do |format|
      format.html do
        @audits = @job.own_and_associated_audits.where.not(user_id: nil).where.not(auditable_type: ['JobRequester', 'JobAssignee', 'JobTechnician', 'Reservation']).first(100)
      end
      format.xls do
        @results = @job.results.includes(:sample, sample_result_field_values: %i[sample_result_field sample])
        @sample_result_field_values = @job.sample_result_field_values.includes(:sample_result_field, :sample).order('sample_result_fields.position').group_by { |rtf| [rtf.sample.id, rtf.result_id] }
      end
      format.js do
        new
        authorize @template = Job.find(params[:id])
      end
      format.pdf do
        pdf = case params[:pdf_type]
              when 'label'
                JobLabelPdf.new(@job, current_user)
              when 'report'
                ThdPdfJobReport.new(@job)
              when 'report2'
                ThdPdfJobReport2.new(@job)
              end
        send_data pdf.render,
                  filename: "J-#{@job.id} - #{@job.name.truncate(60)}.pdf",
                  type: 'application/pdf'
      end
    end
  end

  def new
    @template = current_user.account.template
    @job = current_user.jobs.build(template: false, account: current_user.account)
    fetch_templates

    current_user.account.job_columns.each do |job_column|
      @job.job_column_values.build(job_column: job_column) unless @job.job_column_values.find_by(job_column: job_column)
    end

    authorize @job
  end

  def edit
    @date = params['date']
    @col = params['col']
    @status_col = params['status_col']
  end

  def create
    @job = current_user.jobs.build

    @job.assign_attributes(job_params.merge(template: false).except(:job_fields_attributes))

    if @job.save
      handle_job_fields
      redirect_to @job, notice: 'Job was successfully created.'
    else
      fetch_templates
      render :new
    end
    authorize @job
  end

  def update
    respond_to do |format|
      if @job.update(job_params)
        format.html { redirect_to @job, notice: 'Job was successfully updated.' }
        format.js do
          @date = params[:date]
          @col = params[:col]
          @status_col = params[:status_col]
        end
        format.json do
          render json: { status: :ok }
        end
      else
        format.html { render :edit }
        format.json { render json: @job.errors, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @job.update(to_delete: true)
    DestroyJobWorker.perform_later(@job.id, current_user.id)
    redirect_to jobs_url, notice: 'Job has been deleted.'
  end

  def job_data_cell_contents
    @date = params['date']
    @col = params['col']
    @status_col = params['status_col']
    render partial: 'jobs/index/job_data_cell_contents'
  end

  private

  def handle_job_fields
    job_field_attributes = job_params[:job_fields_attributes] || {}

    @job.reload

    clone_job_fields

    if job_field_attributes.present?
      job_fields = job_field_attributes.keys.map { |id| JobField.find(id) }
      @job.job_fields = job_fields
      @job.assign_attributes(job_fields_attributes: job_field_attributes)
    end

    @job.save

    # temp job template selector fix
    unless params[:job][:template_id].blank?
      @template = Job.find(params[:job][:template_id])
      imported_tasks = CloneTasks.call(@template.tasks.ids, @job, current_user.id)
      sample_import_ids_hash = CloneJob.import_samples(@template, @job.id)
      trait_import_ids_hash = CloneJob.import_traits(@template, @job.id)
      CloneJob.import_field_condition_sets(@template.traits, trait_import_ids_hash)
      sample_trait_import_ids_hash = CloneJob.import_sample_traits(@template, sample_import_ids_hash, trait_import_ids_hash, @job.id)
      CloneJob.import_conditional_field_values(@template.sample_traits, sample_trait_import_ids_hash)
      result_import_ids_hash = CloneJob.import_results(@template, imported_tasks[:imported_tasks][1], sample_import_ids_hash, @job.id)
      CloneJob.import_sample_result_field_values(@template, imported_tasks[:imported_sample_result_fields][1], result_import_ids_hash)
    end
  end

  # clone job the default way (job fields don't work perfectly when supplying the job)
  # copy the template's job_fields to the job to match the ids in the incoming params hash
  # copy the job_ids from the temp job to the template to ensure the template remains unchanged
  #
  # Note: this is meant as a temporary hack to fix the deploy
  def clone_job_fields
    return @job if params[:job][:template_id].blank?

    @template = Job.find(params[:job][:template_id])
    temp_job = CloneJob.call(@template, false, current_user.id)
    @template.job_fields.update_all(job_id: @job.id)
    temp_job.job_fields.update_all(job_id: @template.id)
    temp_job.default_sample_request.destroy
    DestroyJobWorker.perform_later(temp_job.id, current_user.id)
  end

  def fetch_templates
    @templates = policy_scope(Job.order(:name), policy_scope_class: TemplatePolicy::Scope).where(on_job_form: true)
  end

  def set_job
    @job = Job.find(params[:id])
    authorize @job
  end

  def job_params
    params.require(:job).permit(
      :name,
      :job_status_id,
      :template_id,
      :requested_completion,
      :estimated_sample_delivery,
      :estimated_start,
      :actual_sample_delivery,
      :estimated_completion,
      :actual_start,
      :actual_completion,
      :location_id,
      :position,
      :board_order_position,
      :space_type,
      :customer_id,
      :text_col_1,
      :text_col_2,
      :location_names,
      :requester_ids,
      :coordinator_ids,
      :assignee_ids,
      :technician_ids,
      :attachments_files,
      :help_requested_at,
      job_column_values_attributes: %i[id value job_column_id],
      tag_list: [],
      permit_list: [],
      location_names: [],
      requester_ids: [],
      coordinator_ids: [],
      assignee_ids: [],
      technician_ids: [],
      resource_fields_attributes: %i[
        id
        settings_default_field_id
        value
        date_in_words
        datetime_in_words
      ],
      default_samples_attributes: %i[id name number quantity _destroy],
      results_attributes: %i[id status comments],
      samples_attributes: %i[
        id
        name
      ],
      sample_traits_attributes: [
        :id,
        :name,
        { conditional_field_value_attributes: [
          :id,
          :value,
          { attachments_attributes: [
            :document
          ] }
        ] }
      ],
      job_fields_attributes: [
        :id,
        :name,
        {
          field_condition_set_attributes: FieldConditionSet.params
        },
        {
          conditional_field_value_attributes: %i[
            value
            id
          ]
        }
      ],
      spell_attributes: %i[
        id
        step
        wizard_id
      ]
    )
  end

  def build_query
    searches = []
    # params[:query] is explicit in our views, params[:q] is implicit from select2
    query = (params[:query] || params[:q]).to_s.strip

    # Only use keys that are present in params
    search_keys = current_user.direct_pg_searches.keys.select { |key| params[key].present? }

    search_hash = {}
    search_keys.each do |key|
      search_hash[key] = params[key]
    end

    search_values = search_keys.map { |key| "#{key}(#{params[key]})" }

    searches << query unless query.blank?
    searches += search_values

    @query = searches.join(' ')
  end

  # rubocop:disable Lint/UnderscorePrefixedVariableName
  def get_jobs
    @account = current_user.account

    _jobs = policy_scope(@account.jobs)

    # @requesters = @account.users.where(id: JobRequester.where(job_id: _jobs.ids).pluck(:user_id).uniq.compact)
    # @assignees = @account.users.where(id: JobAssignee.where(job_id: _jobs.ids).pluck(:user_id).uniq.compact)
    # @technicians = @account.users.where(id: JobTechnician.where(job_id: _jobs.ids).pluck(:user_id).uniq.compact)
    # @coordinators = @account.users.where(id: JobCoordinator.where(job_id: _jobs.ids).pluck(:user_id).uniq.compact)

    _jobs = _jobs.pg_search(@query)
                 .includes(:tasks)
                 .eager_load(:latest_job_comment)
                 .where(template: false)
                 .order("#{sort_column} #{sort_direction}")

    # _jobs = _jobs.with_status(@status)
    # _jobs = _jobs.includes(:locations).where(locations: { id: params[:location_id] }) if params[:location_id].present?
    # _jobs = _jobs.includes(:job_requesters).where(job_requesters: { user_id: params[:requester_id] }) if params[:requester_id].present?
    # _jobs = _jobs.includes(:job_assignees).where(job_assignees: { user_id: params[:assignee_id] }) if params[:assignee_id].present?
    # _jobs = _jobs.includes(:job_technicians).where(job_technicians: { user_id: params[:technician_id] }) if params[:technician_id].present?
    # _jobs = _jobs.includes(:job_coordinators).where(job_coordinators: { user_id: params[:coordinator_id] }) if params[:coordinator_id].present?
    # _jobs = _jobs.where(job_type_id: params[:job_type_id]) if params[:job_type_id].present?

    # params = params.merge(params[:existing_filters]) if params[:existing_filters]
    # params = params.delete(params[:existing_filters]) if params[:existing_filters]


    @jobs = _jobs.page(params[:page])
                 .per(25)
  end

  def inline_params
    @inline_params ||=
      params
      .reject { |_key, value| value == '' }
      .select do |key, _value|
        [Job::JOB_DATES, Job::JOB_COLUMNS, 'status', 'job_type_id'].flatten.include?(key) ||
          key.include?('job_column') ||
          Job::JOB_DATES.any? { |job_date| key.to_s.include?(job_date) }
      end
  end

  def sort_column
    option_arr = %w[jobs.id settings_job_statuses.name job_comments.created_at job_status_changes.start_date]
    option_arr << Job::JOB_DATES.map { |date| "jobs." + date }
    return params[:sort] if option_arr.flatten.include?(params[:sort])
    'jobs.id'
  end

  def sort_direction
    %w[asc desc].include?(params[:direction]) ? params[:direction] : 'desc'
  end
end
# rubocop:enable Metrics/ClassLength
