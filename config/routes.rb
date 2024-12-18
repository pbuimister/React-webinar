# frozen_string_literal: true

Rails.application.routes.draw do
  resources :material_composites
  resources :materials
  resources :material_properties
  resources :material_categories
  resources :equipment_imports
  resources :job_columns
  resource :account_pdf_reports
  resources :surveys
  resources :survey_templates
  require 'sidekiq/web'

  if Rails.env.production?
    Sidekiq::Web.use Rack::Auth::Basic do |username, password|
      username == CredentialsHelper.fetch_with_default(:misc)[:admin_email] && password == CredentialsHelper.fetch_with_default(:misc)[:http_basic_password]
    end
  end

  mount Sidekiq::Web, at: '/sidekiq'

  devise_for :users, controllers: {
    omniauth_callbacks: 'users/omniauth_callbacks',
    sessions: 'users/sessions'
  }

  namespace :api do
    namespace :v1 do
      devise_for :users, controllers: { sessions: 'api/v1/sessions' }
      resources :jobs, only: [:index, :show]
    end
  end

  devise_scope :user do
    get 'signup' => 'devise/registrations#new'
    get 'login' => 'devise/sessions#new'
    root 'devise/sessions#new'
    get 'users/auth/:saml_opt_name/metadata' => 'users/omniauth_callbacks#metadata', as: :provider_saml_metadata
    match 'users/auth/:saml_opt_name/saml', to: 'users/omniauth_callbacks#provider_request', as: :provider_saml_request, via: %i[get post]
    match 'users/auth/:saml_opt_name/saml/callback', to: 'users/omniauth_callbacks#provider_callback', as: :provider_saml_callback, via: %i[get post]
  end

  namespace :ms_graph do
    resources :folders
  end

  resources :sample_request_queries

  resources :scrape_urls, only: :create

  resource :admin_switch_accounts

  resources :traits
  resources :saved_search_params

  resources :sso, only: %i[create new]

  resource :view, only: :create

  resources :job_associations_table, only: :update
  post 'job_associations_table/:id' => 'job_associations_table#update'

  resources :release_notes, except: [:show]

  resources :job_filters

  resource :account, only: %i[show update]
  post :account, to: 'accounts#update'
  resource :account_procedure, only: %i[show edit update]
  resources :account_tasks, only: :index

  resources :cx_requests do
    member do
      put :update_status
    end
  end

  resources :cx_calendars, only: :index do
    collection do
      get :check_availability
    end
  end

  resources :cx_blackout_dates, except: %i[show]

  resources :forge_requests do
    member do
      put :update_status
    end
    resources :forge_calendar_toggles, only: :create
  end

  resources :forge_calendars, only: :index
  resources :forge_aisles

  resources :task_schedules, only: :index
  resources :custom_tasks

  resources :froala_initializations, only: :index

  resources :material_statuses, except: %i[show]

  namespace :settings do
    resource :sso_settings, only: %i[update edit]
    resources :job_settings, only: [:index]
    resources :equipment_settings, only: [:index]
    resources :task_settings, only: [:index]
    resources :document_settings, only: [:index]
    resources :default_dates, only: [:index]
    resources :job_statuses, except: %i[index show] do
      collection do
        put :update_multiple
      end
    end
    resources :default_fields, except: %i[index show] do
      collection do
        put :update_multiple
      end
    end
    resources :integrations, only: %i[index update]
    resources :delay_reasons
    resources :addresses
  end

  resources :roles, only: %i[index new edit create update destroy]
  resources :job_report_templates, except: [:show] do
    member do
      get :polling
    end
  end

  resources :searches, only: [:create]

  resources :users_admin, controller: 'users' do
    member do
      post 'send_account_link'
    end
  end

  resources :users, only: %i[index]
  resources :saml_opts

  resource :profile, only: [:show]

  resources :job_rollups_locations, only: :update

  namespace :dashboards do
    resources :jobs, only: :index
    resource :default, only: :show, controller: 'default'
  end

  resource :training, only: [:show] do
    collection do
      get :videos
    end
  end

  resources :equipment do
    resource :equipment_notes, only: %i[edit update]
    resource :calibration_notes, only: %i[edit update]
    resources :log_entries, only: %i[new edit update create index destroy] do
      collection do
        get :mark_maintenance_complete
        get :send_for_calibration
      end
    end
    resources :attachment_folders
    resources :attachments do
      collection do
        get :download_all
      end
    end
    resources :calibrations
    resources :maintenances
  end

  resources :account_calibrations, only: %i[index update] do
    member do
      delete 'cancel_calibration'
    end
  end

  resources :account_maintenances, only: %i[index update]

  resources :maintenances, only: [] do
    member do
      get :show_additional_details
    end
  end

  resources :calibration_providers, except: %i[index show]

  resource :dashboard_preference, only: %i[show edit update]

  resources :templates, except: [:show] do
    member do
      post :create_clone
    end
  end

  resources :task_templates do
    resources :task_template_equipments, only: %i[index create destroy]
    resources :task_template_activities, only: %i[index show]
    resources :template_from_templates, only: [:create]
  end

  resources :csv_processes, only: [] do
    member do
      get :polling
    end
  end

  resources :sample_requests do
    resource :bulk_samples, controller: 'sample_requests/bulk_samples', only: %i[create]
    resources :samples, controller: 'sample_requests/samples', except: :show
    get 'samples/:id', to: 'sample_requests/samples#update'
    member do
      patch :set_all_statuses
    end
  end
  resources :unclaimed_samples

  resources :improved_jobs, except: %i[show destroy]
  resources :create_jobs, except: %i[show destroy] do
    member do
      patch :submit_job
      get :reload_samples_table
    end
  end
  
  resources :toggle_schedules, only: %i[index]

  resources :reports, only: %i[edit update]

  resources :samples, controller: 'jobs/samples', only: [] do
    resources :sample_traits do
      collection do
        get 'cell_contents'
      end
    end
  end

  get 'jobs(/:view_type)', to: 'jobs#index', as: 'jobs', constraints: { view_type: /(board|table)/ }
  resources :jobs do
    member do
      get 'job_data_cell_contents'
    end

    resources :samples_table_actions, only: %i[create destroy]
    resources :tasks_table_actions, only: %i[new create edit update destroy] do
      member do
        get 'cell_contents'
      end
    end

    resource :toggle_tasks, controller: 'jobs/toggle_tasks', only: :create
    resources :job_column_values do
      collection do
        get 'cell_contents'
      end
    end

    resources :generate_rendered_job_reports, only: :create
    resources :rendered_job_reports, only: %i[index new edit create update destroy]
    resources :manual_job_report_containers, only: %i[show new edit create update]
    resource :job_notes, only: %i[edit update]
    resource :sample_notes, only: %i[edit update]
    resource :result_notes, only: %i[edit update]
    resources :sample_result_field_values, only: [:update]
    resources :job_status_changes, only: [:index]
    resource :job_permissions, only: %i[edit update]
    resources :job_comments, controller: 'jobs/job_comments'
    resources :tasks, controller: 'jobs/tasks' do
      resources :results, controller: 'jobs/results' do
        member do
          get 'edit_fields'
        end
        collection do
          get 'set_multiple'
        end
      end
    end
    resources :task_costs, only: %i[index]


    resources :samples, controller: 'jobs/samples', only: [] do
      collection do
        get 'planner'
        get 'tasks_overview'
      end
      member do
        get 'cell_contents'
      end
    end

    resources :task_from_templates, only: :create
    resources :samples, controller: 'jobs/samples' do
      collection do
        get :new_multiple
        post :create_multiple
      end
    end
    resources :traits, controller: 'jobs/traits' do
      collection do
        delete :destroy_all
      end
    end
    resources :import_samples, only: %i[new create]
    resources :export_samples, only: [:create]
    resources :import_sequences, only: %i[new create]
    resources :export_sequences, only: [:create]
    resources :discussions
    resources :attachment_folders
    resources :attachments do
      collection do
        get :download_all
      end
    end
    resources :audits, only: %i[index show] do
      collection do
        get :download_audits_report
      end
    end
    resources :reports, only: %i[index show] do
      collection do
        get :download_all
        get :download_all_with_attachments
      end
      resources :job_reports, only: []
      resources :async_job_reports, only: :create
    end
    resources :signatures, only: %i[new edit update create destroy]
    resources :equipment_records, only: %i[index show edit create update destroy] do
      collection do
        get :download_all
        post :add_all_equipment
      end
    end
    resources :assignments, only: %i[index create destroy]
    resources :batches, only: %i[new show edit create update destroy] do
      member do
        post :clone_batch
      end
    end
  end # jobs

  resources :job_fields, only: %i[new edit create update destroy]
  resources :job_field_help_modals, only: %i[show]

  resources :manual_job_report_containers, only: [] do
    resources :manual_job_reports, only: %i[new edit create update destroy]
  end

  resources :job_reports, only: [] do
    resources :job_report_settings, only: [:index] do
      collection do
        get :edit_multiple
        patch :update_multiple
      end
    end
  end

  resources :discussions, only: [] do
    resources :comments, only: %i[edit create update destroy]
  end

  resources :attachments, only: [] do
    collection do
      put :update_multiple
    end
  end

  resources :sample_result_fields, only: %i[edit update delete new create destroy] do
    collection do
      delete :destroy_all
      put :update_multiple
    end
  end

  resources :sample_results, only: %i[edit update delete new create destroy] do
    collection do
      get :preview
      delete :destroy_all
    end
  end

  resources :task_locations, only: %i[new create edit update destroy]

  resources :tasks do
    resources :task_comments
    resources :template_from_tasks, only: :create
    resources :results, controller: 'jobs/results', only: %i[index edit update]

    resources :import_results, only: %i[new create]
    resources :export_results, only: :create

    resources :task_costs, only: %i[new create edit update destroy]

    member do
      put 'planner_update', controller: 'jobs/tasks'
    end
  end

  resources :task_fields, only: %i[create new edit update destroy index] do
    collection do
      delete :destroy_all
    end
  end

  resources :calculations_groups, only: %i[index]

  resources :conditional_field_values

  resources :attachments, only: [:destroy]

  resources :task_approvals, only: %i[create new destroy]

  resources :task_details, only: %i[create new edit update destroy] do
    collection do
      delete :destroy_all
    end
  end

  resources :task_parameters, only: %i[create new edit update destroy] do
    collection do
      get :edit_multiple
      patch :update_multiple
      delete :destroy_all
    end
  end

  resources :task_sample_groups do
    collection do
      delete :destroy_all
    end
  end

  resources :notifications, only: %i[index show update]

  resources :watches, only: :create
  resources :report_statuses, only: :create

  resources :global_searches, only: [:create]

  resources :attachment_folders, except: [:new]
  resources :attachments, except: [:new]

  resources :job_form_fields
  resources :job_types do
    member do
      patch 'clone'
    end
  end

  resources :customers

  resources :documents do
    collection do
      get :download_all
      get :download_audit_report
    end
    resources :document_activities, only: %i[index show]
  end
  resources :document_organizations, except: %i[show]
  resources :document_classifications, except: %i[show]
  resources :document_revisions do
    member do
      get 'download'
    end
  end

  resources :equipment_categories, except: %i[show]

  resources :corrective_actions, except: [:edit] do
    resources :corrective_action_activities, only: %i[index show]
  end

  get 'corrective_actions/:id/edit/(:status)',
      to: 'corrective_actions#edit',
      as: 'edit_corrective_action'

  resources :corrective_action_tasks, except: %i[new index show]
  get 'corrective_action_tasks/new/:corrective_action_id/:status',
      to: 'corrective_action_tasks#new',
      as: 'new_corrective_action_task'

  resources :corrective_action_approvals, except: %i[new index show]
  get 'corrective_action_approvals/new/:corrective_action_id/:status',
      to: 'corrective_action_approvals#new',
      as: 'new_corrective_action_approval'

  resources :archives, only: %i[show index]

  resources :resource_queries, only: %i[new create edit update destroy] do
    member do
      get :preview
      patch :clone
    end
  end

  resources :resource_query_terms, only: [:new]

  resources :notification_triggers, only: %i[index create update destroy]

  resources :schedulables, only: [:index] do
    collection do
      post 'toggle'
    end
  end

  resources :wizards, only: [] do
    resources :spells, only: %i[new edit destroy], controller: 'wizards/spells'
  end

  resources :generated_reports, only: %i[create show edit update]

  resources :job_watch_automations, except: %i[show]

  mount RailsAdmin::Engine => '/admin', as: 'rails_admin'

  mount Shrine.presign_endpoint(:cache) => '/presign'
end
