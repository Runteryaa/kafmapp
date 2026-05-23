BEGIN
  -- 1. Ensure USERS table is available as 'users' for the Worker
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USERS',
      p_object_type  => 'TABLE',
      p_object_alias => 'users',
      p_auto_rest_auth => FALSE
  );

  -- 2. Drop the existing module to start fresh
  ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');

  -- 3. Define the REST Module again
  ORDS.DEFINE_MODULE(
      p_module_name    => 'user_accounts_api',
      p_base_path      => 'user_accounts/',
      p_status         => 'PUBLISHED'
  );

  -- 4. Template for single user lookup
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_priority       => 10
  );

  -- 5. Use 'json/query' source type for single item as well, it returns {"items": [...]}
  -- This is more robust and avoids ROWID issues in some ORDS versions
  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS WHERE ID = :id'
  );

  -- 6. Template for listing all users
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => '.',
      p_priority       => 0
  );

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => '.',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS'
  );

  -- 7. PUT handler for updates
  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
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