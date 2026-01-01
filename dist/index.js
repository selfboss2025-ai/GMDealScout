"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./bot");
async function main() {
    try {
        const bot = new bot_1.GoMiningBot();
        await bot.start();
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map