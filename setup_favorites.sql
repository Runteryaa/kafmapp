CREATE TABLE FAVORITES (
    ID VARCHAR2(255) PRIMARY KEY,
    USERID VARCHAR2(255) NOT NULL,
    PLACEID VARCHAR2(255) NOT NULL,
    LISTTYPE VARCHAR2(50) NOT NULL,
    CREATEDAT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
/

BEGIN
  ORDS.ENABLE_OBJECT(
      p_enabled      => TRUE,
      p_schema       => 'ADMIN',
      p_object       => 'FAVORITES',
      p_object_type  => 'TABLE',
      p_object_alias => 'favorites',
      p_auto_rest_auth => FALSE
  );
  COMMIT;
END;
/