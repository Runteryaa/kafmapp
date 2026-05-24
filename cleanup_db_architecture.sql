BEGIN
  -- 1. Restore Columns to VISIBLE
  BEGIN EXECUTE IMMEDIATE 'ALTER TABLE USERS MODIFY (ROLE VISIBLE, ISBANNED VISIBLE)'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE IMMEDIATE 'ALTER TABLE REVIEWS MODIFY (USERROLE VISIBLE)'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- 2. Drop legacy views and modules
  BEGIN EXECUTE IMMEDIATE 'DROP VIEW USER_ACCOUNTS_VIEW'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE IMMEDIATE 'DROP VIEW REVIEWS_VIEW'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE IMMEDIATE 'DROP VIEW USER_ACCOUNTS_V'; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  BEGIN
    ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 3. Enable standard aliases for all tables
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'USERS', p_object_alias => 'users');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'REVIEWS', p_object_alias => 'reviews');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'PLACES', p_object_alias => 'places');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'PENDING_UPDATES', p_object_alias => 'pending_updates');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'FAVORITES', p_object_alias => 'favorites');

  COMMIT;
END;
/