export const id = 509;
export const ids = [509];
export const modules = {

/***/ 38866:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.execFileAsync = exports.execAsync = void 0;
const child_process = __webpack_require__(35317);
const util = __webpack_require__(39023);
exports.execAsync = util.promisify(child_process.exec);
exports.execFileAsync = util.promisify(child_process.execFile);
//# sourceMappingURL=execAsync.js.map

/***/ }),

/***/ 50509:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getMachineId = void 0;
const execAsync_1 = __webpack_require__(38866);
const api_1 = __webpack_require__(34709);
const EXEC_TIMEOUT_MS = 5000;
async function getMachineId() {
    try {
        const result = await (0, execAsync_1.execFileAsync)('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { timeout: EXEC_TIMEOUT_MS });
        const idLine = result.stdout
            .split('\n')
            .find(line => line.includes('IOPlatformUUID'));
        if (!idLine) {
            return undefined;
        }
        const parts = idLine.split('" = "');
        if (parts.length === 2) {
            return parts[1].slice(0, -1);
        }
    }
    catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
    }
    return undefined;
}
exports.getMachineId = getMachineId;
//# sourceMappingURL=getMachineId-darwin.js.map

/***/ })

};

//# sourceMappingURL=509.index.js.map