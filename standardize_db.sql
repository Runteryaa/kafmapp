BEGIN
  -- 1. Drop all custom modules and views to start fresh
  BEGIN ORDS.DELETE_MODULE(p_module_name => 'user_accounts_api'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE IMMEDIATE 'DROP VIEW USER_ACCOUNTS_VIEW'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE IMMEDIATE 'DROP VIEW REVIEWS_VIEW'; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- 2. Make all columns visible (Our smart worker handles this now)
  EXECUTE IMMEDIATE 'ALTER TABLE USERS MODIFY (ROLE VISIBLE, ISBANNED VISIBLE)';
  EXECUTE IMMEDIATE 'ALTER TABLE REVIEWS MODIFY (USERROLE VISIBLE)';

  -- 3. Enable standard Auto-REST for all tables with original names
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'USERS', p_object_alias => 'users');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'REVIEWS', p_object_alias => 'reviews');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'PLACES', p_object_alias => 'places');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'PENDING_UPDATES', p_object_alias => 'pending_updates');
  ORDS.ENABLE_OBJECT(p_enabled => TRUE, p_schema => 'ADMIN', p_object => 'FAVORITES', p_object_alias => 'favorites');

  COMMIT;
END;
/