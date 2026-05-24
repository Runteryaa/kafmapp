const url = 'https://gb0abb62e885e33-e57vm4usgodt141x.adb.eu-frankfurt-1.oraclecloudapps.com/ords/admin/users/?q={"email":"admin@admin.admin"}';
fetch(url).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(console.error);
