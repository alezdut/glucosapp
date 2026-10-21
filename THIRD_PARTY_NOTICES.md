# Licencias y atribuciones

## Licencia general

Copyright © 2025–2026 Alejandro Zdut y colaboradores. El código original de Glucosapp se distribuye bajo **AGPL-3.0-only**, salvo las excepciones indicadas aquí. Vea [LICENSE](LICENSE). Los archivos de terceros conservan sus avisos y licencias; la licencia general no elimina esos permisos.

## Componente MDI y OpenAPS

`packages/mdi-insulin-algorithm` conserva **MIT**, declarada en el repositorio [mdi-insulin-algorithm](https://github.com/alezdut/mdi-insulin-algorithm). Se incluye su [licencia original](packages/mdi-insulin-algorithm/LICENSE), incluido el aviso educativo y médico, separado del texto AGPL.

El componente se describe como una adaptación conceptual de [oref0/OpenAPS](https://github.com/openaps/oref0). Se conserva el aviso **Copyright (c) 2015–2019 OpenAPS Contributors** y su [licencia MIT](LICENSES/oref0-MIT.txt). Esta referencia no implica respaldo de OpenAPS ni validación de la adaptación para MDI.

## Dependencias

[Inventario](docs/DEPENDENCY_LICENSES.json) registra las licencias de paquetes instalados desde el lockfile, incluidas herramientas de desarrollo. El inventario es informativo y no sustituye sus textos de licencia. Los paquetes npm no se redistribuyen en el archivo fuente de esta release; al distribuir binarios o bundles deben conservarse sus avisos correspondientes.

Se revisaron las declaraciones del inventario, además de los casos sin metadatos: `png-js@1.0.0` contiene MIT en `LICENSE`; `pause@0.0.1` contiene MIT en `Readme.md`. En las alternativas MIT/GPL y BSD/GPL se utiliza la opción permisiva. MPL-2.0 mantiene sus obligaciones por archivo; no se relicencia como AGPL. CC-BY-4.0 corresponde a datos de caniuse-lite y mantiene su atribución. No se detectaron dependencias exclusivamente GPL-2.0-only en este inventario.

La lista representa la instalación validada; plataformas diferentes pueden instalar otros binarios opcionales, que conservan sus licencias.

## Recursos visuales

El logo vectorial compartido se incorporó al repositorio por Alejandro Zdut en `8f2d0ab`; los iconos móviles se incorporaron en `8462a15`; los avatares sintéticos SVG, en `042e0b8`. Estos recursos del proyecto se incluyen bajo AGPL-3.0-only. Las capturas de documentación usan exclusivamente las cuentas y datos sintéticos de la demo.

Los iconos de interfaces proporcionados por Lucide e iconos Material mantienen sus licencias ISC y Apache-2.0, respectivamente. Ningún paciente o profesional representado en la demo es real.

## Compatibilidad nativa

React Native 0.81 fija fmt 11.0.2 (MIT). El hook CocoaPods de esta release adapta `FMT_STRING` en Apple clang 21+ para usar directamente el literal cuando `consteval` ya realiza la validación, siguiendo la implementación posterior de fmt. Se preservan sus avisos y los controles de formatos en compilación. Referencias: [fmt #4740](https://github.com/fmtlib/fmt/issues/4740), [fmt #4612](https://github.com/fmtlib/fmt/pull/4612).
