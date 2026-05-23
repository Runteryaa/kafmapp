BEGIN
  -- 1. Drop existing module and alias
  BEGIN
    ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Make columns INVISIBLE to keep Worker's blind inserts happy
  EXECUTE IMMEDIATE 'ALTER TABLE USERS MODIFY (ROLE INVISIBLE, ISBANNED INVISIBLE)';

  -- 3. Create a VIEW that exposes everything for the Frontend
  EXECUTE IMMEDIATE 'CREATE OR REPLACE VIEW USER_ACCOUNTS_V AS SELECT ID, EMAIL, NAME, CREATEDAT, ROLE, ISBANNED FROM USERS';

  -- 4. Enable ORDS for the VIEW with 'user_accounts' alias
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USER_ACCOUNTS_V',
      p_object_type  => 'VIEW',
      p_object_alias => 'user_accounts',
      p_auto_rest_auth => FALSE
  );

  -- 5. Template for single lookup
  ORDS.DEFINE_TEMPLATE(
      p_module_name    => 'user_accounts_api', -- Re-using name or creating new
      p_pattern        => ':id'
  );
  -- Wait, I shouldn't mix auto-REST and custom modules on the same alias.

  COMMIT;
END;
/