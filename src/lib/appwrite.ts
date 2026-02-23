import { Client, Account, Databases, ID } from "appwrite";

const client = new Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("kafmap");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases, ID };
