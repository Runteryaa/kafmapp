const url = 'https://gb0abb62e885e33-e57vm4usgodt141x.adb.eu-frankfurt-1.oraclecloudapps.com/ords/admin/_/sql';
const auth = Buffer.from('ADMIN:Elmaadamadam!31').toString('base64');
const sql = "UPDATE USERS SET ROLE = 'admin', ISBANNED = 'false' WHERE EMAIL = 'yarrak@am.cik'";

async function run() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Content-Type': 'application/sql'
            },
            body: sql + '; COMMIT;'
        });
        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Body:', text);
    } catch (e) {
        console.error(e);
    }
}
run();
