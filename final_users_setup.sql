BEGIN
  -- 1. Drop EVERYTHING related to users to start clean
  BEGIN
    ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ORDS.ENABLE_OBJECT(p_enabled => FALSE, p_object => 'USER_ACCOUNTS_VIEW');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ORDS.ENABLE_OBJECT(p_enabled => FALSE, p_object => 'USERS', p_schema => 'ADMIN');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Restore Columns as INVISIBLE (compatibility)
  EXECUTE IMMEDIATE 'ALTER TABLE USERS MODIFY (ROLE INVISIBLE, ISBANNED INVISIBLE)';

  -- 3. Define the Clean REST Module
  ORDS.DEFINE_MODULE(
      p_module_name    => 'user_accounts_api',
      p_base_path      => 'user_accounts/',
      p_status         => 'PUBLISHED'
  );

  -- Template for Root (List All)
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

  -- Template for ID (Single Item)
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id'
  );

  -- Using json/query with items array is safer than single-resource mappings
  ORDS.DEFINE_HANDLER(
      p_module_name    => 'user_accounts_api',
      p_pattern        => ':id',
      p_method         => 'GET',
      p_source_type    => 'json/query',
      p_source         => 'SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS WHERE ID = :id'
  );

  -- PUT Handler for Admin updates
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

  -- 4. Enable USERS table with 'users' alias for the Worker
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USERS',
      p_object_type  => 'TABLE',
      p_object_alias => 'users',
      p_auto_rest_auth => FALSE
  );

  COMMIT;
END;
/