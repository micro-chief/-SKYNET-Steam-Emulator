import fs from "node:fs";
import path from "node:path";

const ROOT =
"D:\\Visual Studio Test repos\\-SKYNET-Steam-Emulator-master\\SKYNET server\\GC";

const GAME =
path.join(ROOT, "1422450");

const MODULES =
path.join(GAME, "modules");

const MAIN =
path.join(GAME, "main.ts");

const ROUTES_JSON =
path.join(
    GAME,
    "contracts",
    "routes.json"
);

const GENERATED_ROUTES =
path.join(
    GAME,
    "generated",
    "routes.ts"
);

function verify() {
    return;
}

function read(file: string): string {
    return fs.readFileSync(file, "utf8");
}

function write(file: string, data: string) {
    fs.writeFileSync(file, data, "utf8");
}

function exists(file: string) {
    return fs.existsSync(file);
}

function findModule(routeId: number) {
    const files = fs.readdirSync(MODULES);

    for (const file of files) {
        if (!file.endsWith(".ts"))
            continue;

        const content =
            read(path.join(MODULES, file));

        const match =
            content.match(
                /requestId:\s*(\d+)/
            );

        if (
            match &&
            Number(match[1]) === routeId
        ) {
            return {
                file,
                importName:
                    content.match(
                        /export const (\w+)Route/
                    )?.[1] + "Route",

                handler:
                    content.match(
                        /export const (\w+)\s*=/
                    )?.[1]
            };
        }
    }

    throw new Error(
        `Could not find module registered for request ${routeId}.`
    );
}


function updateRoutesJson(
    routeId:number,
    name:string
) {

    const json =
        JSON.parse(
            read(ROUTES_JSON)
        );

    if (
        json.routes.some(
            (x:any)=>
                x.requestId === routeId
        )
    )
        return;


    json.routes.push({
        requestId: routeId,
        name
    });


    write(
        ROUTES_JSON,
        JSON.stringify(
            json,
            null,
            4
        )
    );
}



function updateGeneratedRoutes(
    routeId:number,
    name:string
) {

    let text =
        read(GENERATED_ROUTES);


    if (
        text.includes(name)
    )
        return;


    text =
        text.replace(
            /export enum Routes\s*{/,
            match =>
                match +
                `\n    ${name} = ${routeId},`
        );


    write(
        GENERATED_ROUTES,
        text
    );
}



function updateMain(
    module:any
) {

    let text =
        read(MAIN);


    const importLine =
`import {
    ${module.importName},
    ${module.handler}
} from "./modules/${module.file.replace(".ts","")}";\n`;


    if (
        !text.includes(importLine)
    ) {

        text =
            importLine +
            "\n" +
            text;
    }


    const register =
`
    gc.on(
        ${module.importName},
        ${module.handler}
    );
`;


    if (
        !text.includes(
            module.handler
        )
    ) {

        text =
            text.replace(
                /return gc\.dispatch\(\);/,
                register +
                "\n    return gc.dispatch();"
            );
    }


    write(
        MAIN,
        text
    );
}



function createModule(
    id:number,
    name:string
) {

    const file =
        path.join(
            MODULES,
            `${name}.ts`
        );


    if (exists(file))
        return;


    const content =
`import {
    Route
} from "../framework/gc";


export const ${name}Route: Route = {
    requestId: ${id},
    request: {
        name: "${name}"
    },
    responseId: ${id + 1},
    response: {
        name: "${name}Response"
    }
};


export const ${name} =
(
    ctx:any
):void => {

    log(
        "[${id}] ${name}"
    );

};


export const create${name}Handler =
() => ${name};

export default ${name};
`;


    write(
        file,
        content
    );
}



function main() {

    verify();


    const args =
        process.argv.slice(2);


    const id =
        Number(args[0]);


    const name =
        args[1];


    if (
        !id ||
        !name
    ) {

        console.log(
            "Usage: node --experimental-strip-types tools/add-route.ts <id> <RouteName>"
        );

        process.exit(1);
    }


    createModule(
        id,
        name
    );


    const module =
        findModule(id);


    updateMain(
        module
    );


    updateRoutesJson(
        id,
        name
    );


    updateGeneratedRoutes(
        id,
        name
    );


    console.log(
        `Route ${id} ${name} added`
    );
}


main();