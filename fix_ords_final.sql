BEGIN
  ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');
  
  ORDS.DEFINE_MODULE(
      p_module_name    => 'user_accounts_api',
      p_base_path      => 'user_accounts/',
      p_status         => 'PUBLISHED'
  );

  -- 1. All Users (Root)
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => '.'
  );

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => '.',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS'
  );

  -- 2. Single User (ID lookup)
  -- Use a pattern that doesn't conflict with root
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => 'id/:id'
  );

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => 'id/:id',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS WHERE ID = :id'
  );

  -- 3. PUT for Updates
  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => 'id/:id',
      p_method         => 'PUT',
      p_source_type    => 'plsql/gateway',
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