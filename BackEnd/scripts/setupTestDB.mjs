
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve paths relative to the script.
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(backendRoot, "supabase", "config.toml");
const schemaPath = join(backendRoot, "tests", "schema.sql");

// Tables defined in the exported CS320 schema.
const expectedTables = [
    "allergens",
    "allergies",
    "locations",
    "favorite_foods",
    "ingredients",
    "meal_items",
    "meals",
    "menu_item_allergens",
    "menu_item_ingredients",
    "menu_items",
    "passwords",
    "users",
];

// Execute Docker commands.
function docker(args, options = {}) {
    return execFileSync("docker", args, {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        ...options,
    }).trim();
}

// Retrieve the tables currently in the local database.
function currentTables(container) {
    const output = docker([
        "exec", container,
        "psql",
        "-X", "-q", "-A", "-t",
        "-v", "ON_ERROR_STOP=1",
        "-U", "postgres",
        "-d", "postgres",
        "-c",
        "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'",
    ]);

    return new Set(output.split(/\r?\n/).filter(Boolean));
}

try {
    // Read the project ID from Supabase configuration.
    const config = readFileSync(configPath, "utf8");

    const match = config.match(
        /^project_id\s*=\s*"([A-Za-z0-9_-]+)"\s*$/m
    );

    if (!match) {
        throw new Error(
            "Could not read project_id in supabase/config.toml"
        );
    }

    // Identify the LOCAL Supabase Docker container.
    const container = `supabase_db_${match[1]}`;

    const running = docker([
        "ps",
        "--format",
        "{{.Names}}",
    ]).split(/\r?\n/);

    if (!running.includes(container)) {
        throw new Error(
            `Local Supabase container '${container}' not found. ` +
            "Run 'npx supabase start' from BackEnd first."
        );
    }

    // Check if the project tables already exist.
    const present = currentTables(container);

    const existing = expectedTables.filter(
        table => present.has(table)
    );

    // If all tables already exist, skip importing.
    if (existing.length === expectedTables.length) {
        console.log(
            `All ${expectedTables.length} CS320 tables already exist. Skipping import.`
        );
        process.exit(0);
    }

    // Prevent importing over an incomplete database schema.
    if (existing.length !== 0) {
        throw new Error(
            `Partial schema detected (${existing.length}/${expectedTables.length} tables). ` +
            `Existing: ${existing.join(", ")}. Refusing to overwrite it.`
        );
    }

    // Read schema.sql.
    const sql = readFileSync(schemaPath);

    if (sql.length === 0) {
        throw new Error(`Schema file is empty: ${schemaPath}`);
    }

    console.log(
        `Importing ${schemaPath} into LOCAL container '${container}'...`
    );

    // Import the schema as a single transaction.
    // If an SQL statement fails, the transaction rolls back.
    execFileSync("docker", [
        "exec", "-i", container,
        "psql",
        "-X",
        "-1",
        "-v", "ON_ERROR_STOP=1",
        "-U", "postgres",
        "-d", "postgres",
    ], {
        input: sql,
        stdio: ["pipe", "inherit", "inherit"],
    });

    // Verify that the expected tables now exist.
    const after = currentTables(container);

    const missing = expectedTables.filter(
        table => !after.has(table)
    );

    if (missing.length) {
        throw new Error(
            `Import finished, but missing tables: ${missing.join(", ")}`
        );
    }

    console.log(
        `Success! ${expectedTables.length} CS320 tables are present in local Supabase.`
    );

} catch (error) {
    console.error("Test DB setup failed:", error.message);
    process.exitCode = 1;
}
