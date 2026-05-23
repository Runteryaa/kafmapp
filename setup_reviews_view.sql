BEGIN
  -- 1. Create View for Reviews to include hidden columns
  EXECUTE IMMEDIATE 'CREATE OR REPLACE VIEW REVIEWS_VIEW AS SELECT ID, PLACEID, USERID, USERNAME, RATING, COMMENTTEXT, IMAGEURL, CREATEDAT, USERROLE FROM REVIEWS';

  -- 2. Enable REST for the View
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'REVIEWS_VIEW',
      p_object_type  => 'VIEW',
      p_object_alias => 'reviews_list',
      p_auto_rest_auth => FALSE
  );
  
  COMMIT;
END;
/