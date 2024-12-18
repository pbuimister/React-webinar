class UsersController < ApplicationController
  before_action :set_user, only: %i[show edit update destroy send_account_link]
  before_action :set_account
  helper_method :sort_column, :sort_direction

  def index
    authorize User

    query = params[:query].is_a?(Array) ? params[:query].first : params[:query]

    @users = policy_scope(User.pg_search(query))
             .includes(:tags, :role, :account)
             .page(params[:page])
             .where.not(id: 3)
             .where.not(is_active: false)
             .order(sort_column => sort_direction)

    respond_to do |format|
      format.html {}
      format.json do
        return if params[:traits].present?
        # TODO: respond with JBuilder for all cases
        # return is used to respond with JBuilder for KanbanBoardApp view
        @users = @users.per(10)
        @users = @users.none unless query.present?
        render json: @users.as_json(only: :id, methods: :name_and_email)
      end
    end
  end

  def show; end

  def new
    @user = @account.users.build
    authorize @user
  end

  def edit; end

  def create
    generated_password = Devise.friendly_token
    @user = @account.users.build(user_params.merge(password: generated_password))

    authorize @user

    if @user.save
      redirect_to users_admin_path(@user), notice: 'User was successfully created.'
    else
      render :new
    end
  end

  def update
    if @user.update(user_params)
      redirect_to users_admin_path(@user), notice: 'User was successfully updated.'
    else
      render :edit
    end
  end

  def destroy
    @user.update(is_active: false)
    redirect_to users_admin_index_path, notice: 'User has been deleted.'
  end

  def send_account_link
    raw_token = GenerateDeviseTokens.call(@user)
    UserMailer.delay.new_user(@user.id, raw_token)
    redirect_to users_admin_path(@user), notice: 'Instructions for setting password and logging in are being sent to the user.'
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_user
    @user = User.find(params[:id])
    authorize @user
  end

  def set_account
    @account = current_user.account
  end

  # Never trust parameters from the scary internet, only allow the white list through.
  def user_params
    params.require(:user).permit(
      :email,
      :sms_number,
      :role_id,
      :full_name,
      :title_name,
      :daily_effort_in_words,
      :company,
      :notes,
      :time_zone,
      :location_id,
      :is_sso,
      tag_list: []
    )
  end

  def sort_column
    %w[last_sign_in_at full_name email].include?(params[:sort]) ? params[:sort] : 'last_sign_in_at'
  end

  def sort_direction
    %w[asc desc].include?(params[:direction]) ? params[:direction] : 'desc'
  end
end
