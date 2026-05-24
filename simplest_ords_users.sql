BEGIN
  -- 1. Clean start
  BEGIN
    ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Define Module
  ORDS.DEFINE_MODULE(
      p_module_name    => 'user_accounts_api',
      p_base_path      => 'user_accounts/',
      p_status         => 'PUBLISHED'
  );

  -- 3. Handler for GLOBAL LIST (Base path)
  -- Pattern is empty string to match the base path directly
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

  -- 4. Handler for INDIVIDUAL USER (/{id})
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id'
  );

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS WHERE ID = :id'
  );

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

  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_method         => 'DELETE',
      p_source_type    => 'plsql/gateway',
      p_source         => 'BEGIN DELETE FROM USERS WHERE ID = :id; COMMIT; END;'
  );

  COMMIT;
END;
/