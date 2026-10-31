export const id = 288;
export const ids = [288];
export const modules = {

/***/ 20830:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   q: () => (/* binding */ execAsync)
/* harmony export */ });
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(35317);
/* harmony import */ var util__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(39023);


//#region src/detectors/platform/node/machine-id/execAsync.ts
const execAsync = util__WEBPACK_IMPORTED_MODULE_1__.promisify(child_process__WEBPACK_IMPORTED_MODULE_0__.exec);
//#endregion


//# sourceMappingURL=execAsync.mjs.map

/***/ }),

/***/ 74288:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getMachineId: () => (/* binding */ getMachineId)
/* harmony export */ });
/* harmony import */ var _execAsync_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(20830);
/* harmony import */ var _opentelemetry_api__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(96798);
/* harmony import */ var process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(932);



//#region src/detectors/platform/node/machine-id/getMachineId-win.ts
async function getMachineId() {
	const args = "QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid";
	let command = "%windir%\\System32\\REG.exe";
	if (process__WEBPACK_IMPORTED_MODULE_0__.arch === "ia32" && "PROCESSOR_ARCHITEW6432" in process__WEBPACK_IMPORTED_MODULE_0__.env) command = "%windir%\\sysnative\\cmd.exe /c " + command;
	try {
		const parts = (await (0,_execAsync_mjs__WEBPACK_IMPORTED_MODULE_1__/* .execAsync */ .q)(`${command} ${args}`)).stdout.split("REG_SZ");
		if (parts.length === 2) return parts[1].trim();
	} catch (e) {
		_opentelemetry_api__WEBPACK_IMPORTED_MODULE_2__/* .diag */ .s.debug(`error reading machine id: ${e}`);
	}
}
//#endregion


//# sourceMappingURL=getMachineId-win.mjs.map

/***/ })

};

//# sourceMappingURL=288.index.js.map