export const id = 669;
export const ids = [669];
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

/***/ 97669:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getMachineId = void 0;
const fs_1 = __webpack_require__(79896);
const execAsync_1 = __webpack_require__(38866);
const api_1 = __webpack_require__(34709);
const EXEC_TIMEOUT_MS = 5000;
async function getMachineId() {
    try {
        const result = await fs_1.promises.readFile('/etc/hostid', { encoding: 'utf8' });
        return result.trim();
    }
    catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
    }
    try {
        const result = await (0, execAsync_1.execFileAsync)('/bin/kenv', ['-q', 'smbios.system.uuid'], { timeout: EXEC_TIMEOUT_MS });
        return result.stdout.trim();
    }
    catch (e) {
        api_1.diag.debug(`error reading machine id: ${e}`);
    }
    return undefined;
}
exports.getMachineId = getMachineId;
//# sourceMappingURL=getMachineId-bsd.js.map

/***/ })

};

//# sourceMappingURL=669.index.js.map