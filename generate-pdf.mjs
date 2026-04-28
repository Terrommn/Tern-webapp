import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF({ unit: "mm", format: "letter" });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const ML = 25; // margin left
const MR = 25;
const MT = 30;
const CW = W - ML - MR; // content width
let y = MT;

// ── Colors ──
const RED = [200, 30, 30];
const DARK = [30, 30, 30];
const GRAY = [100, 100, 100];
const LIGHT_GRAY = [160, 160, 160];
const WHITE = [255, 255, 255];
const BG_LIGHT = [245, 245, 245];

// ── Helpers ──
function setColor(rgb) { doc.setTextColor(...rgb); }
function checkPage(need = 20) {
  if (y + need > H - 20) { doc.addPage(); y = MT; return true; }
  return false;
}

function drawLine(x1, y1, x2, y2, color = LIGHT_GRAY, width = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}

function sectionTitle(text) {
  checkPage(25);
  y += 6;
  setColor(RED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(text, ML, y);
  y += 2;
  drawLine(ML, y, ML + CW, y, RED, 0.8);
  y += 8;
}

function subTitle(text) {
  checkPage(15);
  y += 3;
  setColor(DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, ML, y);
  y += 6;
}

function bodyText(text) {
  checkPage(12);
  setColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, CW);
  doc.text(lines, ML, y);
  y += lines.length * 5 + 3;
}

function bulletList(items) {
  setColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of items) {
    checkPage(10);
    doc.setFont("helvetica", "bold");
    setColor(RED);
    doc.text("▸", ML + 2, y);
    doc.setFont("helvetica", "normal");
    setColor(GRAY);
    const lines = doc.splitTextToSize(item, CW - 10);
    doc.text(lines, ML + 8, y);
    y += lines.length * 5 + 2;
  }
  y += 2;
}

function taskCard(title, desc, objective, expected) {
  checkPage(40);
  // Card background
  doc.setFillColor(...BG_LIGHT);
  const cardH = 32;
  doc.roundedRect(ML, y - 2, CW, cardH, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(RED);
  doc.text(title, ML + 4, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(DARK);
  doc.text(`Descripción: ${desc}`, ML + 4, y + 10);
  setColor(GRAY);
  doc.text(`Objetivo: ${objective}`, ML + 4, y + 16);
  doc.text(`Resultado esperado: ${expected}`, ML + 4, y + 22);

  y += cardH + 5;
}

function tableRow(cols, widths, bold = false, bg = null) {
  checkPage(10);
  if (bg) {
    doc.setFillColor(...bg);
    doc.rect(ML, y - 4, CW, 8, "F");
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(9);
  setColor(bold ? WHITE : GRAY);
  if (bold && bg) setColor(WHITE);
  if (!bold) setColor(DARK);
  let x = ML;
  for (let i = 0; i < cols.length; i++) {
    const lines = doc.splitTextToSize(cols[i], widths[i] - 2);
    doc.text(lines, x + 2, y);
    x += widths[i];
  }
  y += 7;
}

// ══════════════════════════════════════════════════════════════
// PAGE 1: COVER
// ══════════════════════════════════════════════════════════════

// Red banner at top
doc.setFillColor(...RED);
doc.rect(0, 0, W, 8, "F");

// Subtle geometric accent
doc.setFillColor(220, 50, 50);
doc.rect(0, H - 60, W, 60, "F");
doc.setFillColor(180, 20, 20);
doc.triangle(0, H - 60, W * 0.6, H, 0, H, "F");

// Title block
y = 65;
setColor(RED);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("TERNIUMFLOW", W / 2, y, { align: "center" });
y += 4;
drawLine(W / 2 - 30, y, W / 2 + 30, y, RED, 0.5);

y += 18;
setColor(DARK);
doc.setFontSize(28);
doc.text("Plan de Pruebas", W / 2, y, { align: "center" });
y += 12;
doc.setFontSize(28);
doc.text("de Usuario", W / 2, y, { align: "center" });

y += 14;
setColor(GRAY);
doc.setFont("helvetica", "normal");
doc.setFontSize(12);
doc.text("Sistema de Gestión y Optimización de Empacado de Acero", W / 2, y, { align: "center" });

y += 8;
drawLine(ML + 30, y, W - MR - 30, y, LIGHT_GRAY, 0.3);

// Team members
y += 14;
const members = [
  ["Jose Miguel Santiesteban", "A01723866"],
  ["Luis Enrique Castillo", "A00842390"],
  ["Ismael Alvarez", "A01286818"],
  ["Neil Rodriguez", "A01199152"],
  ["Diego Utzicate", "A0676769"],
];

doc.setFontSize(10);
for (const [name, mat] of members) {
  setColor(DARK);
  doc.setFont("helvetica", "bold");
  doc.text(name, W / 2 - 5, y, { align: "right" });
  setColor(LIGHT_GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`  ${mat}`, W / 2 + 5, y);
  y += 7;
}

// Date on the bottom geometric area
setColor(WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Abril 2026", W / 2, H - 25, { align: "center" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
setColor([255, 200, 200]);
doc.text("Tecnológico de Monterrey", W / 2, H - 17, { align: "center" });

// ══════════════════════════════════════════════════════════════
// PAGE 2+: CONTENT
// ══════════════════════════════════════════════════════════════
doc.addPage();
y = MT;

// Footer helper
function addFooters() {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...LIGHT_GRAY);
    doc.text("TerniumFlow — Plan de Pruebas de Usuario", ML, H - 10);
    doc.text(`${i} / ${pages}`, W - MR, H - 10, { align: "right" });
    // Top accent line
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.8);
    doc.line(0, 3, W, 3);
  }
}

// ── 1. Introducción ──
sectionTitle("1. Introducción");

subTitle("1.1 Descripción del Sistema");
bodyText(
  "TerniumFlow es un sistema web integral desarrollado para la gestión y optimización del flujo de órdenes de producción de acero en Ternium. " +
  "La plataforma integra tres componentes principales: (1) una aplicación web construida con Next.js que permite la gestión de órdenes, clientes y productos con dashboards en tiempo real; " +
  "(2) una base de datos en Supabase con autenticación por roles (administrador, operador, cliente) y Row Level Security; y " +
  "(3) un simulador 3D interactivo desarrollado en Unity WebGL que permite visualizar la optimización del empacado de productos siderúrgicos en tarimas."
);

subTitle("1.2 Objetivo del Plan de Pruebas");
bodyText(
  "Evaluar la funcionalidad, usabilidad y efectividad del sistema TerniumFlow mediante pruebas estructuradas con usuarios reales y simulados, " +
  "con el fin de identificar áreas de mejora en la experiencia de usuario, validar la correcta integración entre módulos (web, base de datos y simulador 3D), " +
  "y asegurar que el sistema cumple con los objetivos de optimización de empacado antes de la entrega final."
);

subTitle("1.3 Alcance");
bulletList([
  "Módulo Web: Dashboard principal, gestión de órdenes, clientes y productos, calculadora de empaquetado, y sistema de autenticación por roles.",
  "Base de Datos: Operaciones CRUD, integridad de datos, Row Level Security y respuesta del sistema bajo condiciones normales de uso.",
  "Simulador 3D (Unity WebGL): Visualización interactiva del empacado, interacción con el cubo 3D y experiencia inmersiva del usuario.",
]);

// ── 2. Objetivos de Prueba ──
sectionTitle("2. Objetivos de Prueba");

subTitle("2.1 Aspectos a Evaluar");
bulletList([
  "Usabilidad: Facilidad de navegación, claridad de la interfaz y curva de aprendizaje del sistema.",
  "Funcionalidad: Correcta ejecución de operaciones CRUD, filtros, búsquedas y cálculos de empaque.",
  "Eficiencia: Tiempos de respuesta en carga de datos, navegación entre módulos y renderizado del simulador 3D.",
  "Comprensión del Empacado: Capacidad del usuario para interpretar las recomendaciones de empaque y la visualización 3D.",
  "Experiencia de Usuario (UX): Satisfacción general, coherencia visual y percepción de profesionalismo del sistema.",
  "Seguridad de Roles: Verificación de que cada tipo de usuario solo accede a las funcionalidades autorizadas.",
]);

subTitle("2.2 Preguntas de Investigación");
bulletList([
  "¿Los usuarios pueden completar las tareas principales sin asistencia externa?",
  "¿El simulador 3D aporta valor real a la comprensión del empacado óptimo?",
  "¿El sistema de roles restringe correctamente el acceso según el perfil del usuario?",
  "¿La interfaz es suficientemente intuitiva para usuarios sin experiencia técnica?",
  "¿Los tiempos de carga y respuesta son aceptables para un entorno de producción industrial?",
]);

// ── 3. Perfil de Usuarios ──
sectionTitle("3. Perfil de Usuarios");

const tw = [CW * 0.25, CW * 0.2, CW * 0.15, CW * 0.4];
tableRow(["Perfil", "Rol en Sistema", "Cantidad", "Justificación"], tw, true, RED);
tableRow(["Ing. Industrial", "Administrador", "2", "Representa al usuario principal que gestiona órdenes y toma decisiones operativas."], tw);
tableRow(["Operador de planta", "Operador", "1", "Valida la usabilidad desde la perspectiva de ejecución en piso."], tw);
tableRow(["Estudiante Ing.", "Cliente", "2", "Perfil no técnico que evalúa la intuitividad general del sistema."], tw);

y += 4;
bodyText(
  "Se seleccionaron 5 participantes siguiendo la recomendación de Nielsen (2000), que establece que 5 usuarios detectan aproximadamente el 85% de los problemas de usabilidad. " +
  "Los perfiles cubren los tres roles del sistema (administrador, operador, cliente) para garantizar una evaluación integral."
);

// ── 4. Escenarios y Tareas ──
sectionTitle("4. Escenarios y Tareas de Prueba");

bodyText("A continuación se definen los escenarios concretos que cada usuario ejecutará durante la sesión de pruebas:");
y += 2;

taskCard(
  "Tarea 1 — Inicio de Sesión por Rol",
  "Iniciar sesión con credenciales asignadas según su rol.",
  "Verificar que el sistema autentica correctamente y redirige al dashboard apropiado.",
  "El usuario accede al sistema y visualiza únicamente las secciones autorizadas para su rol."
);

taskCard(
  "Tarea 2 — Consultar Dashboard Principal",
  "Navegar al dashboard y analizar los KPIs mostrados (órdenes, clientes, productos, peso total).",
  "Evaluar la claridad y utilidad de la información presentada en tiempo real.",
  "El usuario identifica correctamente al menos 3 de los 4 KPIs sin ayuda."
);

taskCard(
  "Tarea 3 — Gestión de Órdenes",
  "Crear una nueva orden de producción, buscar una orden existente y filtrar por estatus.",
  "Verificar la funcionalidad CRUD y la facilidad de uso del módulo de órdenes.",
  "La orden se crea exitosamente y aparece en la tabla con el estatus correcto."
);

taskCard(
  "Tarea 4 — Calculadora de Empaquetado",
  "Seleccionar un tipo de producto, ingresar cantidad y generar recomendación de empaque.",
  "Evaluar la comprensión del usuario sobre las dimensiones y peso recomendados.",
  "El usuario obtiene dimensiones de tarima y puede interpretar la recomendación."
);

taskCard(
  "Tarea 5 — Simulador 3D de Empacado",
  "Acceder al módulo de simulación, interactuar con la visualización 3D del empacado.",
  "Evaluar la experiencia inmersiva y la comprensión espacial del empaque óptimo.",
  "El usuario interactúa con el modelo 3D y comprende la disposición sugerida de productos."
);

taskCard(
  "Tarea 6 — Consulta de Clientes y Productos",
  "Navegar a los módulos de clientes y productos, buscar registros específicos.",
  "Verificar la navegación entre módulos y la consistencia de datos.",
  "El usuario localiza la información solicitada en menos de 30 segundos."
);

// ── 5. Metodología ──
sectionTitle("5. Metodología de Evaluación");

subTitle("5.1 Tipo de Prueba");
bodyText(
  "Se realizarán pruebas presenciales moderadas, donde un facilitador guiará la sesión y un observador tomará notas. " +
  "Cada sesión individual tendrá una duración aproximada de 25-35 minutos. El facilitador proporcionará las instrucciones iniciales " +
  "pero no intervendrá durante la ejecución de las tareas, salvo que el usuario solicite ayuda explícitamente (lo cual será registrado como incidencia)."
);

subTitle("5.2 Herramientas");
bulletList([
  "Google Forms: Encuesta pre-test (perfil del usuario) y post-test (satisfacción y retroalimentación).",
  "Grabación de pantalla (OBS Studio): Captura de la interacción del usuario con el sistema para análisis posterior.",
  "Hoja de observación estructurada: Registro en tiempo real de errores, dudas y comportamientos del usuario.",
  "Cronómetro: Medición de tiempos de ejecución por tarea.",
  "Escala SUS (System Usability Scale): Cuestionario estandarizado de 10 preguntas para medir usabilidad percibida.",
]);

subTitle("5.3 Métricas");
const mw = [CW * 0.30, CW * 0.40, CW * 0.30];
tableRow(["Métrica", "Descripción", "Forma de Medición"], mw, true, RED);
tableRow(["Tasa de éxito", "% de tareas completadas sin ayuda", "Observación directa"], mw);
tableRow(["Tiempo de ejecución", "Segundos por tarea", "Cronómetro"], mw);
tableRow(["Número de errores", "Clics erróneos o acciones incorrectas", "Grabación + observación"], mw);
tableRow(["Satisfacción (SUS)", "Puntuación de usabilidad percibida", "Cuestionario SUS (0-100)"], mw);
tableRow(["Solicitudes de ayuda", "Veces que el usuario pide asistencia", "Registro del facilitador"], mw);
tableRow(["Net Promoter Score", "Probabilidad de recomendar el sistema", "Pregunta post-test (0-10)"], mw);

// ── 6. Instrumentos ──
sectionTitle("6. Instrumentos de Recolección");

subTitle("6.1 Encuesta Pre-Test");
bodyText("Formulario breve para establecer el perfil del participante:");
bulletList([
  "Edad, ocupación y nivel de experiencia con sistemas web.",
  "Familiaridad previa con sistemas industriales o de logística.",
  "Frecuencia de uso de herramientas digitales en su trabajo/estudio.",
]);

subTitle("6.2 Escala SUS (Post-Test)");
bodyText(
  "Cuestionario estandarizado de 10 ítems con escala Likert de 5 puntos (1 = Totalmente en desacuerdo, 5 = Totalmente de acuerdo). " +
  "Ejemplos de afirmaciones incluidas:"
);
bulletList([
  "\"Creo que me gustaría utilizar este sistema con frecuencia.\"",
  "\"Encontré el sistema innecesariamente complejo.\"",
  "\"Creo que necesitaría el apoyo de una persona técnica para usar este sistema.\"",
  "\"Me sentí muy confiado/a al usar el sistema.\"",
]);

subTitle("6.3 Hoja de Observación");
bodyText("Documento estructurado que el observador completará durante cada sesión, incluyendo:");
bulletList([
  "Tarea ejecutada e indicador de éxito/fallo.",
  "Tiempo de inicio y finalización de cada tarea.",
  "Errores cometidos y su descripción.",
  "Comentarios verbales del usuario (think-aloud protocol).",
  "Lenguaje corporal y señales de frustración o confusión.",
]);

subTitle("6.4 Preguntas Abiertas de Retroalimentación");
bulletList([
  "¿Qué fue lo más fácil de usar en el sistema?",
  "¿Qué fue lo más difícil o confuso?",
  "¿Qué cambiarías o mejorarías?",
  "¿El simulador 3D te ayudó a entender mejor el empacado? ¿Por qué?",
  "¿Recomendarías este sistema para uso en un entorno industrial real?",
]);

// ── 7. Criterios de Evaluación ──
sectionTitle("7. Criterios de Evaluación");

subTitle("7.1 Definición de Éxito y Fallo");
bodyText("Se establecen los siguientes criterios para determinar si una tarea fue completada exitosamente:");
bulletList([
  "Éxito total: El usuario completa la tarea sin errores y sin solicitar ayuda.",
  "Éxito parcial: El usuario completa la tarea con errores menores o con una solicitud de ayuda.",
  "Fallo: El usuario no logra completar la tarea, abandona o requiere intervención directa del facilitador.",
]);

subTitle("7.2 Umbrales de Aceptación");
const uw = [CW * 0.40, CW * 0.30, CW * 0.30];
tableRow(["Criterio", "Umbral Mínimo", "Umbral Óptimo"], uw, true, RED);
tableRow(["Tasa de éxito total", "≥ 70%", "≥ 85%"], uw);
tableRow(["Puntuación SUS", "≥ 68 (aceptable)", "≥ 80 (excelente)"], uw);
tableRow(["Tiempo promedio por tarea", "< 120 segundos", "< 60 segundos"], uw);
tableRow(["Errores por tarea", "≤ 3 errores", "≤ 1 error"], uw);
tableRow(["NPS", "≥ 7", "≥ 9"], uw);

y += 3;
bodyText(
  "Si algún umbral mínimo no se cumple, se generará un reporte de hallazgos críticos con recomendaciones de mejora prioritarias para la siguiente iteración."
);

// ── 8. Plan de Ejecución ──
sectionTitle("8. Plan de Ejecución");

subTitle("8.1 Cronograma");
const cw2 = [CW * 0.30, CW * 0.35, CW * 0.35];
tableRow(["Fecha", "Actividad", "Responsable"], cw2, true, RED);
tableRow(["17-18 Abr 2026", "Preparación de materiales y ambiente de prueba", "Todo el equipo"], cw2);
tableRow(["19 Abr 2026", "Prueba piloto (1 usuario)", "Neil Rodriguez"], cw2);
tableRow(["21-22 Abr 2026", "Sesiones de prueba (4 usuarios)", "Jose Miguel / Luis Enrique"], cw2);
tableRow(["23-24 Abr 2026", "Transcripción y tabulación de datos", "Ismael / Diego"], cw2);
tableRow(["25 Abr 2026", "Análisis de resultados y redacción de reporte", "Todo el equipo"], cw2);

subTitle("8.2 Descripción de la Sesión");
bodyText("Cada sesión de prueba seguirá el siguiente protocolo estandarizado:");
bulletList([
  "Bienvenida y firma de consentimiento informado (3 min): Se explica el propósito de la prueba y se asegura la confidencialidad.",
  "Encuesta pre-test (3 min): El participante completa el formulario de perfil.",
  "Instrucciones generales (2 min): Se explica la dinámica think-aloud y se aclara que se evalúa el sistema, no al usuario.",
  "Ejecución de tareas (15-20 min): El usuario realiza las 6 tareas definidas mientras se graba la pantalla y el observador toma notas.",
  "Cuestionario SUS y preguntas abiertas (5 min): El participante completa la encuesta post-test.",
  "Cierre y agradecimiento (2 min): Se agradece la participación y se recogen comentarios finales.",
]);

// ── 9. Análisis de Resultados ──
sectionTitle("9. Análisis de Resultados (Propuesta)");

subTitle("9.1 Métodos de Análisis");
bodyText("Los datos recolectados se analizarán mediante los siguientes métodos:");
bulletList([
  "Análisis cuantitativo: Estadística descriptiva (media, mediana, desviación estándar) para métricas de tiempo, errores y tasa de éxito. Cálculo del puntaje SUS según la fórmula estándar de Brooke (1996).",
  "Análisis cualitativo: Categorización temática de los comentarios y observaciones para identificar patrones recurrentes de fricción o satisfacción.",
  "Matriz de priorización: Cruce entre frecuencia del problema y severidad del impacto para generar un ranking de mejoras prioritarias.",
  "Comparación por roles: Análisis segmentado por tipo de usuario para identificar si algún rol presenta dificultades específicas.",
]);

subTitle("9.2 Conclusiones Esperadas");
bodyText("Al finalizar el análisis, se espera obtener:");
bulletList([
  "Un índice de usabilidad general del sistema (puntaje SUS).",
  "Identificación de las 3-5 principales áreas de mejora ordenadas por prioridad.",
  "Validación de la efectividad del simulador 3D como herramienta de comprensión del empacado.",
  "Recomendaciones concretas y accionables para la siguiente iteración del sistema.",
  "Confirmación de que el sistema de roles funciona correctamente desde la perspectiva del usuario.",
]);

subTitle("9.3 Formato de Reporte Final");
bodyText(
  "Los resultados se presentarán en un documento complementario que incluirá: resumen ejecutivo, tablas de resultados por tarea y por usuario, " +
  "gráficas comparativas, capturas de pantalla anotadas con hallazgos clave, y un plan de acción con mejoras propuestas priorizadas."
);

// ── Add footers to all pages ──
addFooters();

// ── Save ──
const buffer = doc.output("arraybuffer");
fs.writeFileSync("Plan_Pruebas_Usuario_TerniumFlow.pdf", Buffer.from(buffer));
console.log("✅ PDF generado: Plan_Pruebas_Usuario_TerniumFlow.pdf");
