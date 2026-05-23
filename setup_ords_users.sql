BEGIN
  -- 1. Ensure USERS is aliased to 'users' for the Worker (Blind inserts/updates)
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USERS',
      p_object_type  => 'TABLE',
      p_object_alias => 'users',
      p_auto_rest_auth => FALSE
  );

  -- 2. Define a custom REST Module for 'user_accounts' to handle /{id} properly and show hidden columns
  ORDS.DEFINE_MODULE(
      p_module_name    => 'user_accounts_api',
      p_base_path      => 'user_accounts/',
      p_items_per_page => 100,
      p_status         => 'PUBLISHED',
      p_comments       => 'API for managing user accounts with hidden columns'
  );

  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_priority       => 0,
      p_etag_type      => 'HASH',
      p_comments       => 'Get a specific user'
  );

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_method         => 'GET',
      p_source_type    => 'json/query;png-item',
      p_items_per_page => 1,
      p_mimes_allowed  => '',
      p_comments       => 'Get user record by ID including hidden columns',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS WHERE ID = :id'
  );

  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => '.',
      p_priority       => 0,
      p_etag_type      => 'HASH',
      p_comments       => 'Get all users'
  );

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => '.',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_items_per_page => 100,
      p_mimes_allowed  => '',
      p_comments       => 'List all users including hidden columns',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS'
  );
  
  -- 3. Add PUT handler for updates (roles, banning)
  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_method         => 'PUT',
      p_source_type    => 'plsql/gateway',
      p_items_per_page => 0,
      p_mimes_allowed  => '',
      p_comments       => 'Update user role or ban status',
      p_source         => 'BEGIN 
                            UPDATE USERS SET 
                                ROLE = COALESCE(:role, ROLE), 
                                ISBANNED = COALESCE(:isBanned, ISBANNED) 
                            WHERE ID = :id;
                            COMMIT;
                           END;'
  );

  COMMIT;
END;
/