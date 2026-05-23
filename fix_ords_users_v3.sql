BEGIN
  ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');
  
  ORDS.DEFINE_MODULE(
      p_module_name    => 'user_accounts_api',
      p_base_path      => 'user_accounts/',
      p_status         => 'PUBLISHED'
  );

  -- Template for the root (List all)
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

  -- Template for ID lookup
  -- Removed leading slash or dots, just the parameter
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

  COMMIT;
END;
/