export const id = 765;
export const ids = [765];
export const modules = {

/***/ 70474:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   m: () => (/* binding */ execFileAsync),
/* harmony export */   q: () => (/* binding */ execAsync)
/* harmony export */ });
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(35317);
/* harmony import */ var util__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(39023);


//#region src/detectors/platform/node/machine-id/execAsync.ts
const execAsync = util__WEBPACK_IMPORTED_MODULE_1__.promisify(child_process__WEBPACK_IMPORTED_MODULE_0__.exec);
const execFileAsync = util__WEBPACK_IMPORTED_MODULE_1__.promisify(child_process__WEBPACK_IMPORTED_MODULE_0__.execFile);
//#endregion


//# sourceMappingURL=execAsync.mjs.map

/***/ }),

/***/ 18765:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getMachineId: () => (/* binding */ getMachineId)
/* harmony export */ });
/* harmony import */ var _execAsync_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(70474);
/* harmony import */ var _opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(96798);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79896);



//#region src/detectors/platform/node/machine-id/getMachineId-bsd.ts
const EXEC_TIMEOUT_MS = 5e3;
async function getMachineId() {
	try {
		return (await fs__WEBPACK_IMPORTED_MODULE_0__.promises.readFile("/etc/hostid", { encoding: "utf8" })).trim();
	} catch (e) {
		_opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__/* .diag */ .s.debug(`error reading machine id: ${e}`);
	}
	try {
		return (await (0,_execAsync_mjs__WEBPACK_IMPORTED_MODULE_2__/* .execFileAsync */ .m)("/bin/kenv", ["-q", "smbios.system.uuid"], { timeout: EXEC_TIMEOUT_MS })).stdout.trim();
	} catch (e) {
		_opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__/* .diag */ .s.debug(`error reading machine id: ${e}`);
	}
}
//#endregion


//# sourceMappingURL=getMachineId-bsd.mjs.map

/***/ })

};

//# sourceMappingURL=765.index.js.map