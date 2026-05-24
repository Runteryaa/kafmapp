const crypto = require('crypto');

const email = "admin@admin.admin";
const password = "yarrakpro31";
const name = "Admin User";
const id = "admin_" + Date.now();

// App's hashing logic (SHA-256)
const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

const url = 'https://gb0abb62e885e33-e57vm4usgodt141x.adb.eu-frankfurt-1.oraclecloudapps.com/ords/admin/_/sql';
const auth = Buffer.from('ADMIN:Elmaadamadam!31').toString('base64');

const sql = `
DECLARE
  v_count NUMBER;
BEGIN
  SELECT count(*) INTO v_count FROM USERS WHERE EMAIL = '${email}';
  
  IF v_count > 0 THEN
    UPDATE USERS SET PASSWORD = '${hashedPassword}', ROLE = 'admin', ISBANNED = 'false' WHERE EMAIL = '${email}';
  ELSE
    INSERT INTO USERS (ID, EMAIL, PASSWORD, NAME, ROLE, ISBANNED, CREATEDAT) 
    VALUES ('${id}', '${email}', '${hashedPassword}', '${name}', 'admin', 'false', '${new Date().toISOString()}');
  END IF;
  
  COMMIT;
END;
`;

async function run() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Content-Type': 'application/sql'
            },
            body: sql
        });
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Body:', text);
    } catch (e) {
        console.error(e);
    }
}
run();
