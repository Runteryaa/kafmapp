BEGIN
  -- 1. Ensure USERS is aliased to 'users' for the Worker
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USERS',
      p_object_type  => 'TABLE',
      p_object_alias => 'users',
      p_auto_rest_auth => FALSE
  );

  -- 2. Create a View for the Frontend to bypass Worker's /users/ block
  EXECUTE IMMEDIATE 'CREATE OR REPLACE VIEW USER_ACCOUNTS_VIEW AS SELECT * FROM USERS';

  -- 3. Enable REST for the View with 'user_accounts' alias
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USER_ACCOUNTS_VIEW',
      p_object_type  => 'VIEW',
      p_object_alias => 'user_accounts',
      p_auto_rest_auth => FALSE
  );
  
  COMMIT;
END;
/