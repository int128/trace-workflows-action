export const id = 512;
export const ids = [512];
export const modules = {

/***/ 88512:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getMachineId: () => (/* binding */ getMachineId)
/* harmony export */ });
/* harmony import */ var _opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(96798);
/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79896);


//#region src/detectors/platform/node/machine-id/getMachineId-linux.ts
async function getMachineId() {
	for (const path of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) try {
		return (await fs__WEBPACK_IMPORTED_MODULE_0__.promises.readFile(path, { encoding: "utf8" })).trim();
	} catch (e) {
		_opentelemetry_api__WEBPACK_IMPORTED_MODULE_1__/* .diag */ .s.debug(`error reading machine id: ${e}`);
	}
}
//#endregion


//# sourceMappingURL=getMachineId-linux.mjs.map

/***/ })

};

//# sourceMappingURL=512.index.js.map