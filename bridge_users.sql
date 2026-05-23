BEGIN
  -- 1. Restore USERS table to a clean state with all columns VISIBLE
  -- This ensures ORDS works naturally for the frontend
  EXECUTE IMMEDIATE 'ALTER TABLE USERS MODIFY (ROLE VISIBLE, ISBANNED VISIBLE)';
  
  -- 2. Ensure Primary Key is active
  BEGIN
    EXECUTE IMMEDIATE 'ALTER TABLE USERS ADD CONSTRAINT USERS_PK PRIMARY KEY (ID)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 3. Enable ORDS for the table with 'user_accounts' alias
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USERS',
      p_object_type  => 'TABLE',
      p_object_alias => 'user_accounts',
      p_auto_rest_auth => FALSE
  );

  -- 4. Create a specialized endpoint for the Worker to handle its blind inserts
  -- We'll use the 'users' alias for this
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'USERS',
      p_object_type  => 'TABLE',
      p_object_alias => 'users_raw', -- temporary
      p_auto_rest_auth => FALSE
  );
  
  COMMIT;
END;
/