# Backend Local DB Setup

This project uses Supabase as its database. For integration testing, we use a local Supabase instance running through Docker. The local database schema is created using the existing Supabase migrations, so there is no need to manually import a separate SQL schema file. 

Before setting up the local database make sure to install docker desktop and it in the terminal

## Steps to Run Integration Tests

After installing node/npm, you should run `npm run setup:test-db` which starts the local Supabase database. 

You should then run `npx supabase status` to find the Supabase URL and Supabase Key. When running that you should see a Supabase URL like `http://127.0.0.1:54321` and a local publishable key.


Then, create/edit the `.env.test` file with:

`SUPABASE_URL=http://127.0.0.1:54321`


`SUPABASE_KEY=<your-local-publishable-key>`

Once you have setup your .env.test file you should be all set and can run your integration tests. Some sample calls for current integration tests would be:

`node --env-file=.env.test ./node_modules/vitest/vitest.mjs run src/tests/menus.integration.test.ts`

`node --env-file=.env.test ./node_modules/vitest/vitest.mjs run src/db/tests/menuData.integration.test.ts`

`node --env-file=.env.test ./node_modules/vitest/vitest.mjs run src/tests/users.integration.test.ts`


The only thing you have to be careful for is to make sure that your migration files are up-to-date before running tests