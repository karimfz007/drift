@echo off
REM Thin ASCII shim. All logic lives in nightly-sweep.mjs -- see the header there for why.
cd /d "%~dp0.."
node tools\nightly-sweep.mjs %*
