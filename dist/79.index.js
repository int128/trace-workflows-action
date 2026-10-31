export const id = 79;
export const ids = [79];
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

/***/ 32079:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getMachineId: () => (/* binding */ getMachineId)
/* harmony export */ });
/* harmony import */ var _execAsync_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(20830);
/* harmony import */ var _opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(96798);


//#region src/detectors/platform/node/machine-id/getMachineId-darwin.ts
async function getMachineId() {
	try {
		const idLine = (await (0,_execAsync_mjs__WEBPACK_IMPORTED_MODULE_0__/* .execAsync */ .q)("ioreg -rd1 -c \"IOPlatformExpertDevice\"")).stdout.split("\n").find((line) => line.includes("IOPlatformUUID"));
		if (!idLine) return;
		const parts = idLine.split("\" = \"");
		if (parts.length === 2) return parts[1].slice(0, -1);
	} catch (e) {
		_opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__/* .diag */ .s.debug(`error reading machine id: ${e}`);
	}
}
//#endregion


//# sourceMappingURL=getMachineId-darwin.mjs.map

/***/ })

};

//# sourceMappingURL=79.index.js.map