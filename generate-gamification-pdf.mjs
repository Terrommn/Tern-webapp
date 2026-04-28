import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF({ unit: "mm", format: "letter" });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const ML = 22;
const MR = 22;
const MT = 28;
const CW = W - ML - MR;
let y = MT;

// ── Colors ──
const RED = [200, 30, 30];
const DARK = [30, 30, 30];
const GRAY = [100, 100, 100];
const LIGHT_GRAY = [160, 160, 160];
const WHITE = [255, 255, 255];
const BG_LIGHT = [245, 245, 245];
const AMBER = [180, 120, 20];
const EMERALD = [16, 150, 72];

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
  y += 8;
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
  y += 4;
  setColor(DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, ML, y);
  y += 6;
}

function subSubTitle(text) {
  checkPage(12);
  y += 2;
  setColor(DARK);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(10);
  doc.text(text, ML + 2, y);
  y += 5;
}

function bodyText(text) {
  checkPage(12);
  setColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, CW);
  for (const line of lines) {
    checkPage(5);
    doc.text(line, ML, y);
    y += 4.5;
  }
  y += 2;
}

function bulletList(items) {
  setColor(GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const item of items) {
    checkPage(10);
    doc.setFont("helvetica", "bold");
    setColor(RED);
    doc.text("\u25B8", ML + 2, y);
    doc.setFont("helvetica", "normal");
    setColor(GRAY);
    const lines = doc.splitTextToSize(item, CW - 10);
    for (let i = 0; i < lines.length; i++) {
      checkPage(5);
      doc.text(lines[i], ML + 8, y);
      y += 4.5;
    }
    y += 1;
  }
  y += 2;
}

function tableRow(cols, widths, bold = false, bg = null) {
  checkPage(10);
  if (bg) {
    doc.setFillColor(...bg);
    doc.rect(ML, y - 4, CW, 8, "F");
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8);
  setColor(bold ? WHITE : DARK);
  let x = ML;
  for (let i = 0; i < cols.length; i++) {
    const lines = doc.splitTextToSize(String(cols[i]), widths[i] - 3);
    doc.text(lines[0] || "", x + 2, y);
    x += widths[i];
  }
  y += 7;
}

function smallTableRow(cols, widths, bold = false, bg = null) {
  checkPage(8);
  if (bg) {
    doc.setFillColor(...bg);
    doc.rect(ML, y - 3.5, CW, 7, "F");
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(7.5);
  setColor(bold ? WHITE : DARK);
  let x = ML;
  for (let i = 0; i < cols.length; i++) {
    const text = doc.splitTextToSize(String(cols[i]), widths[i] - 2);
    doc.text(text[0] || "", x + 1.5, y);
    x += widths[i];
  }
  y += 6;
}

function infoCard(title, content) {
  checkPage(25);
  doc.setFillColor(...BG_LIGHT);
  const contentLines = doc.splitTextToSize(content, CW - 12);
  const cardH = 10 + contentLines.length * 4.5;
  doc.roundedRect(ML, y - 2, CW, cardH, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(RED);
  doc.text(title, ML + 5, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(DARK);
  let cy = y + 10;
  for (const line of contentLines) {
    doc.text(line, ML + 5, cy);
    cy += 4.5;
  }
  y += cardH + 4;
}

// ══════════════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════════════
doc.setFillColor(...RED);
doc.rect(0, 0, W, 8, "F");

doc.setFillColor(220, 50, 50);
doc.rect(0, H - 55, W, 55, "F");
doc.setFillColor(180, 20, 20);
doc.triangle(0, H - 55, W * 0.6, H, 0, H, "F");

y = 55;
setColor(RED);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("STEELFLOW PRO \u2014 TERNIUMFLOW", W / 2, y, { align: "center" });
y += 4;
drawLine(W / 2 - 35, y, W / 2 + 35, y, RED, 0.5);

y += 20;
setColor(DARK);
doc.setFontSize(30);
doc.text("Plan de", W / 2, y, { align: "center" });
y += 14;
doc.text("Gamificaci\u00f3n", W / 2, y, { align: "center" });

y += 10;
setColor(GRAY);
doc.setFont("helvetica", "normal");
doc.setFontSize(12);
doc.text("Sistema No-Competitivo de Engagement Individual", W / 2, y, { align: "center" });

y += 5;
doc.setFontSize(10);
doc.text("XP \u2022 Niveles \u2022 Anillos \u2022 Rachas \u2022 Logros \u2022 Misiones \u2022 Cosm\u00e9ticos", W / 2, y, { align: "center" });

y += 6;
drawLine(ML + 30, y, W - MR - 30, y, LIGHT_GRAY, 0.3);

y += 12;
setColor(DARK);
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Preparado para: Equipo Ternium", W / 2, y, { align: "center" });
y += 7;
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
setColor(GRAY);
doc.text("Generado por an\u00e1lisis de 4 agentes de IA especializados", W / 2, y, { align: "center" });
y += 5;
doc.text("con investigaci\u00f3n en gamificaci\u00f3n no-competitiva para B2B industrial", W / 2, y, { align: "center" });

setColor(WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Abril 2026", W / 2, H - 22, { align: "center" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
setColor([255, 200, 200]);
doc.text("Tecnol\u00f3gico de Monterrey", W / 2, H - 14, { align: "center" });


// ══════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ══════════════════════════════════════════════════════════════
doc.addPage();
y = MT;
sectionTitle("Contenido");
const tocItems = [
  "1. Resumen Ejecutivo",
  "2. Fundamentos Te\u00f3ricos y Principios de Dise\u00f1o",
  "3. Sistema de XP y Niveles (12 Rangos)",
  "4. Anillos Diarios \u2014 Steel Rings",
  "5. Sistema de Rachas (Streaks)",
  "6. Heatmap de Actividad",
  "7. Logros y Badges (55 Logros en 5 Tiers)",
  "8. Mastery Paths (3 Caminos de Maestr\u00eda)",
  "9. Onboarding Gamificado (12 Misiones)",
  "10. Desaf\u00edos Diarios/Semanales/Mensuales (20 Desaf\u00edos)",
  "11. Misiones Semanales y Mensuales (22 Quests)",
  "12. Eventos Estacionales (4 por A\u00f1o)",
  "13. Sistema de Cosm\u00e9ticos y Recompensas",
  "14. Records Personales",
  "15. Recaps Semanales",
  "16. Mapa de UI \u2014 D\u00f3nde Va Cada Elemento",
  "17. Schema SQL Completo (18 Tablas)",
  "18. Nuevas P\u00e1ginas y Componentes",
];
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
for (const item of tocItems) {
  setColor(DARK);
  doc.text(item, ML + 5, y);
  y += 6.5;
}


// ══════════════════════════════════════════════════════════════
// 1. RESUMEN EJECUTIVO
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("1. Resumen Ejecutivo");

bodyText(
  "Este documento presenta el plan completo de gamificaci\u00f3n para SteelFlow Pro (TerniumFlow), una webapp de gesti\u00f3n de \u00f3rdenes de producci\u00f3n de acero. " +
  "El sistema fue dise\u00f1ado por 4 agentes de IA especializados que investigaron y propusieron estrategias complementarias, luego debatieron para seleccionar la mejor combinaci\u00f3n."
);

subTitle("Debate de Agentes y Selecci\u00f3n");
bodyText(
  "Agente 1 (Progreso y Maestr\u00eda): Propuso un sistema de XP con 10 niveles, 3 mastery paths y 12 badges. " +
  "Agente 2 (H\u00e1bitos y Rachas): Propuso anillos diarios tipo Apple Watch, 35 desaf\u00edos, heatmap de actividad y sistema de rachas con 'Escudo de Acero'. " +
  "Agente 3 (Logros y Badges): Propuso 55 logros en 5 tiers de rareza, celebraciones animadas, 12 tipos de records personales y un trophy case. " +
  "Agente 4 (Quests y Narrativa): Propuso 12 rangos narrativos ('Steel Chronicles'), onboarding gamificado de 12 pasos, eventos estacionales y cosm\u00e9ticos desbloqueables."
);

bodyText(
  "El plan final combina lo mejor de cada agente: los 12 rangos narrativos del Agente 4, los 3 anillos diarios del Agente 2, los 55 logros del Agente 3, " +
  "los 3 mastery paths del Agente 1, el onboarding del Agente 4, los desaf\u00edos del Agente 2, los cosm\u00e9ticos del Agente 4, " +
  "y los records personales del Agente 3. Todo unificado en 18 tablas Supabase con Row Level Security."
);

subTitle("Principio Central: Sin Competencia");
bodyText(
  "TODA la gamificaci\u00f3n es individual. No hay leaderboards, rankings ni comparaciones entre usuarios. " +
  "Cada elemento rastrea el crecimiento personal del operador: su propio XP, sus propias rachas, sus propios records. " +
  "Esto se basa en investigaci\u00f3n que demuestra que los gr\u00e1ficos de rendimiento personal superan a las tablas de clasificaci\u00f3n para la motivaci\u00f3n intr\u00ednseca (Octalysis Framework, Yu-kai Chou)."
);

subTitle("Resumen Cuantitativo");
const sw = [CW * 0.50, CW * 0.50];
tableRow(["Elemento", "Cantidad"], sw, true, RED);
tableRow(["Niveles/Rangos", "12 (Aprendiz de Forja \u2192 Maestro de la Forja)"], sw);
tableRow(["Logros/Badges", "55 (en 5 tiers: Acero, Cobre, Plata, Oro, Platino)"], sw);
tableRow(["Mastery Paths", "3 (Order Flow, Client Relations, Product Specialist)"], sw);
tableRow(["Onboarding Quests", "12 misiones guiadas"], sw);
tableRow(["Weekly Quests", "10 rotativas"], sw);
tableRow(["Monthly Quests", "10 rotativas"], sw);
tableRow(["Desaf\u00edos (Challenges)", "20 (10 diarios, 5 semanales, 5 mensuales)"], sw);
tableRow(["Eventos Estacionales", "4 por a\u00f1o (trimestrales)"], sw);
tableRow(["Cosm\u00e9ticos Desbloqueables", "5 fondos + 5 temas sidebar + 5 acentos + 6 marcos avatar + 16 t\u00edtulos"], sw);
tableRow(["Records Personales", "11 tipos"], sw);
tableRow(["Anillos Diarios", "3 (Flujo, Tonelaje, Alcance)"], sw);
tableRow(["Tablas Supabase nuevas", "18 tablas con RLS"], sw);
tableRow(["P\u00e1ginas nuevas", "3 (/progreso, /misiones, /desafios)"], sw);


// ══════════════════════════════════════════════════════════════
// 2. FUNDAMENTOS TEORICOS
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("2. Fundamentos Te\u00f3ricos");

subTitle("2.1 Octalysis Framework (Yu-kai Chou)");
bodyText(
  "Core Drive 2 (Desarrollo y Logro): 'Un badge sin desaf\u00edo no tiene significado.' Cada recompensa requiere esfuerzo genuino dentro del flujo de trabajo real. " +
  "Core Drive 3 (Creatividad y Feedback): Los usuarios se enganchan cuando reciben retroalimentaci\u00f3n en tiempo real (toasts XP, animaciones de anillos). " +
  "Core Drive 4 (Propiedad): Los usuarios sienten que 'poseen' su perfil, rachas y colecci\u00f3n de logros, profundizando el engagement."
);

subTitle("2.2 Hook Model (Nir Eyal)");
bodyText(
  "Trigger \u2192 Action \u2192 Variable Reward \u2192 Investment. Cada loop de engagement: " +
  "trigger (notificaci\u00f3n al inicio del turno), acci\u00f3n (procesar una orden), " +
  "recompensa variable (bonus XP sorpresa, milestone inesperado), " +
  "inversi\u00f3n (el contador de racha que no quieres perder)."
);

subTitle("2.3 Atomic Habits (James Clear)");
bodyText(
  "Habit stacking: 'Despu\u00e9s de iniciar sesi\u00f3n en SteelFlow, veo mis metas diarias.' " +
  "4 leyes: Hazlo Obvio (anillos visibles en dashboard), Hazlo Atractivo (animaciones de racha), " +
  "Hazlo F\u00e1cil (auto-tracking de acciones), Hazlo Satisfactorio (feedback visual inmediato)."
);

subTitle("2.4 Self-Determination Theory (Deci & Ryan)");
bodyText(
  "Competencia: logros prueban maestr\u00eda. Autonom\u00eda: el usuario elige qu\u00e9 logros perseguir y qu\u00e9 cosm\u00e9ticos usar. " +
  "Relaci\u00f3n: sistema no-competitivo preserva lazos colaborativos entre compa\u00f1eros de planta."
);

subTitle("2.5 Principios de Dise\u00f1o para SteelFlow");
bulletList([
  "Sin leaderboards ni comparaci\u00f3n entre usuarios \u2014 todo es crecimiento personal",
  "XP ligado a acciones de trabajo reales, no tareas artificiales",
  "Visible pero no intrusivo \u2014 gamificaci\u00f3n mejora el UI sin bloquear flujos de trabajo",
  "Tem\u00e1tica sider\u00fargica \u2014 nombres de nivel, badges e iconos usan terminolog\u00eda industrial",
  "Respeto a la carga cognitiva \u2014 operadores gestionan procesos f\u00edsicos adem\u00e1s de la app",
]);


// ══════════════════════════════════════════════════════════════
// 3. SISTEMA DE XP Y NIVELES
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("3. Sistema de XP y Niveles");

subTitle("3.1 Acciones que Otorgan XP");
bodyText("Cada acci\u00f3n del flujo de trabajo real genera XP. Caps diarios previenen farming.");

const xpw = [CW * 0.45, CW * 0.15, CW * 0.40];
tableRow(["Acci\u00f3n", "XP", "Notas"], xpw, true, RED);
tableRow(["Crear una orden", "25", "Core workflow"], xpw);
tableRow(["Completar orden (CUM)", "40", "Alto valor"], xpw);
tableRow(["Actualizar estatus orden", "15", "Tracking cr\u00edtico"], xpw);
tableRow(["Crear un cliente", "30", "Enriquecimiento de datos"], xpw);
tableRow(["Crear un producto", "30", "Construcci\u00f3n de cat\u00e1logo"], xpw);
tableRow(["Editar producto", "20", "Mejora de calidad de datos"], xpw);
tableRow(["Ver detalle orden/cliente/producto", "5", "Max 20/d\u00eda"], xpw);
tableRow(["Usar b\u00fasqueda", "3", "Max 15/d\u00eda"], xpw);
tableRow(["Usar simulador (sesi\u00f3n >2 min)", "20", "1x/d\u00eda"], xpw);
tableRow(["Usar calculadora de empaque", "15", "Uso de herramienta"], xpw);
tableRow(["Login diario", "10", "Consistencia"], xpw);
tableRow(["Bonus: racha 7 d\u00edas", "75", "Milestone"], xpw);
tableRow(["Bonus: racha 30 d\u00edas", "250", "Milestone mayor"], xpw);
tableRow(["Bonus: 10 ordenes en sesi\u00f3n", "50", "Productividad batch"], xpw);

subTitle("3.2 Progresi\u00f3n de 12 Niveles");
bodyText("Curva exponencial inspirada en RPGs. Los primeros niveles son r\u00e1pidos para enganche temprano.");

const lw = [CW * 0.08, CW * 0.25, CW * 0.25, CW * 0.12, CW * 0.30];
tableRow(["Nv", "T\u00edtulo (EN)", "T\u00edtulo (ES)", "XP Req", "Perk"], lw, true, RED);
tableRow(["1", "Forge Apprentice", "Aprendiz de Forja", "0", "Perfil b\u00e1sico + onboarding"], lw);
tableRow(["2", "Steel Initiate", "Iniciado del Acero", "200", "Nivel visible en sidebar"], lw);
tableRow(["3", "Melt Technician", "T\u00e9cnico de Fundici\u00f3n", "500", "Widget progreso en dashboard"], lw);
tableRow(["4", "Rolling Specialist", "Esp. de Laminaci\u00f3n", "1,000", "Mastery paths desbloqueado"], lw);
tableRow(["5", "Quality Inspector", "Inspector de Calidad", "2,000", "Avatar border personalizable"], lw);
tableRow(["6", "Shift Supervisor", "Supervisor de Turno", "3,500", "Animaciones XP activadas"], lw);
tableRow(["7", "Production Planner", "Planificador de Prod.", "5,500", "Badge de Veterano"], lw);
tableRow(["8", "Plant Engineer", "Ingeniero de Planta", "8,000", "Dashboard mastery completo"], lw);
tableRow(["9", "Operations Chief", "Jefe de Operaciones", "12,000", "Tema exclusivo de perfil"], lw);
tableRow(["10", "Forge Commander", "Comandante de Forja", "17,000", "Marco dorado de perfil"], lw);
tableRow(["11", "Steel Architect", "Arquitecto del Acero", "24,000", "Paleta de colores exclusiva"], lw);
tableRow(["12", "Master of the Forge", "Maestro de la Forja", "33,000", "Marco animado + todo"], lw);

bodyText("Estimaci\u00f3n: Niveles 1-3 en 1-2 semanas. Niveles 4-6 en 1-3 meses. Niveles 7-9 en 3-6 meses. Niveles 10-12 en 6-12+ meses.");


// ══════════════════════════════════════════════════════════════
// 4. STEEL RINGS (Daily Goals)
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("4. Anillos Diarios \u2014 Steel Rings");

bodyText(
  "Inspirados en los anillos de actividad de Apple Watch, adaptados para operaciones sider\u00fargicas. " +
  "3 anillos conc\u00e9ntricos que se llenan conforme el usuario trabaja. 100% auto-tracking."
);

const rw = [CW * 0.15, CW * 0.20, CW * 0.25, CW * 0.15, CW * 0.25];
tableRow(["Anillo", "Nombre", "Target Default", "Color", "Rastrea"], rw, true, RED);
tableRow(["Exterior", "Flujo", "5 \u00f3rdenes/d\u00eda", "#d41111", "\u00d3rdenes creadas/actualizadas"], rw);
tableRow(["Medio", "Tonelaje", "50 ton/d\u00eda", "#f59e0b", "net_weight_ton acumulado"], rw);
tableRow(["Interior", "Alcance", "3 entidades/d\u00eda", "#10b981", "Clientes/productos distintos"], rw);

y += 2;
bulletList([
  "Targets configurables por usuario en Settings",
  "Anillos pueden exceder 100% (hasta 300%) recompensando sobrelogro",
  "'Triple Cierre' al cerrar los 3 anillos: celebraci\u00f3n breve con stats del d\u00eda",
  "Animaci\u00f3n de ring-close: glow sutil consistente con steelflow-card-hover est\u00e9tica",
  "Ubicaci\u00f3n: Dashboard sidebar (arriba de Calculadora), mini-indicador en sidebar nav",
]);


// ══════════════════════════════════════════════════════════════
// 5. SISTEMA DE RACHAS
// ══════════════════════════════════════════════════════════════
sectionTitle("5. Sistema de Rachas (Streaks)");

bodyText(
  "Loss aversion (Kahneman & Tversky): perder una racha de 30 d\u00edas duele ~2x m\u00e1s que el placer de llegar al d\u00eda 30. " +
  "Este asimetr\u00eda es el motor principal de retenci\u00f3n diaria."
);

subTitle("5.1 Tipos de Racha");
const skw = [CW * 0.25, CW * 0.45, CW * 0.30];
tableRow(["Tipo", "Requisito", "Ubicaci\u00f3n"], skw, true, RED);
tableRow(["Racha de Flujo", "Cerrar \u22651 anillo por d\u00eda laboral", "Dashboard + sidebar"], skw);
tableRow(["Racha Perfecta", "Cerrar 3/3 anillos por d\u00eda laboral", "Perfil"], skw);
tableRow(["Racha Semanal", "3/3 anillos \u22654 de 7 d\u00edas/semana", "Weekly recap"], skw);

subTitle("5.2 Mec\u00e1nicas de Protecci\u00f3n");
bulletList([
  "Escudo de Acero: Se gana 1 escudo por cada 7 d\u00edas de racha. M\u00e1ximo 3 escudos.",
  "El escudo se auto-activa si un d\u00eda laboral pasa sin actividad, preservando la racha.",
  "Per\u00edodo de gracia: Si el usuario inicia sesi\u00f3n en las primeras 2 horas del d\u00eda siguiente, se preserva retroactivamente.",
  "D\u00edas no laborales (seg\u00fan schedule configurado) NO rompen rachas pero tampoco las incrementan.",
  "Milestones visuales: 7 d\u00edas=chispa, 30=llama, 90=infierno, 365=acero fundido",
  "'Personal Best' siempre visible para motivar a superar el record propio tras un break.",
]);


// ══════════════════════════════════════════════════════════════
// 6. HEATMAP
// ══════════════════════════════════════════════════════════════
sectionTitle("6. Heatmap de Actividad");

bodyText(
  "Inspirado en el contribution graph de GitHub. Grid de 52x7 (12 meses), cada celda muestra intensidad de actividad. " +
  "5 niveles de color usando la paleta roja de SteelFlow (del 0% al 100% de opacidad de #d41111)."
);

bulletList([
  "Nivel 0 (sin actividad): slate-800 (dark) / slate-100 (light)",
  "Nivel 1 (1 anillo cerrado): #d41111 al 20%",
  "Nivel 2 (2 anillos): #d41111 al 40%",
  "Nivel 3 (3 anillos): #d41111 al 70%",
  "Nivel 4 (3 anillos + sobrelogro): #d41111 al 100%",
  "Tooltip al hover: fecha, anillos cerrados, \u00f3rdenes procesadas, tonelaje",
  "Ubicaci\u00f3n: Dashboard (nueva secci\u00f3n entre Charts y Recent Orders), P\u00e1gina /progreso",
]);


// ══════════════════════════════════════════════════════════════
// 7. LOGROS Y BADGES
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("7. Logros y Badges (55 Logros)");

subTitle("7.1 Sistema de Tiers");
const tw = [CW * 0.15, CW * 0.20, CW * 0.15, CW * 0.15, CW * 0.35];
tableRow(["Tier", "Nombre", "Color", "XP", "Descripci\u00f3n"], tw, true, RED);
tableRow(["T1", "Acero", "#94a3b8", "10", "Primer contacto, acciones b\u00e1sicas (12 badges)"], tw);
tableRow(["T2", "Cobre", "#d97706", "25", "Engagement repetido, h\u00e1bitos (14 badges)"], tw);
tableRow(["T3", "Plata", "#9ca3af+", "50", "Milestones significativos (14 badges)"], tw);
tableRow(["T4", "Oro", "#eab308", "100", "Rendimiento sostenido excepcional (10 badges)"], tw);
tableRow(["T5", "Platino", "gradient", "250", "Dedicaci\u00f3n legendaria a largo plazo (5 badges)"], tw);

bodyText("8 de 55 logros son ocultos (hidden) \u2014 se descubren al desbloquearlos, creando momentos de sorpresa.");

subTitle("7.2 Cat\u00e1logo por Categor\u00eda");

subSubTitle("Gesti\u00f3n de \u00d3rdenes (14 badges)");
const bw = [CW * 0.25, CW * 0.40, CW * 0.20, CW * 0.15];
smallTableRow(["Nombre", "Criterio", "Tier", "Hidden?"], bw, true, RED);
smallTableRow(["Primera Orden", "Crear 1 orden", "Acero", "No"], bw);
smallTableRow(["Manos a la Obra", "Crear 10 \u00f3rdenes", "Acero", "No"], bw);
smallTableRow(["Flujo Constante", "Crear 50 \u00f3rdenes", "Cobre", "No"], bw);
smallTableRow(["Centuri\u00f3n de \u00d3rdenes", "Crear 100 \u00f3rdenes", "Plata", "No"], bw);
smallTableRow(["Medio Millar", "500 \u00f3rdenes", "Oro", "No"], bw);
smallTableRow(["Mil de Acero", "1,000 \u00f3rdenes", "Platino", "No"], bw);
smallTableRow(["Peso Pesado", "1 tonelada acumulada", "Acero", "No"], bw);
smallTableRow(["Cien Toneladas", "100 ton acumuladas", "Cobre", "No"], bw);
smallTableRow(["Kilotonelaje", "1,000 ton", "Plata", "No"], bw);
smallTableRow(["Megat\u00f3n", "10,000 ton", "Oro", "No"], bw);
smallTableRow(["Cierre R\u00e1pido", "Orden CUM en <24h", "Cobre", "No"], bw);
smallTableRow(["Racha Productiva", "5 CUM en un d\u00eda", "Plata", "No"], bw);
smallTableRow(["Turno Perfecto", "10 CUM/d\u00eda sin reverts", "Oro", "S\u00ed"], bw);
smallTableRow(["Fuerza Tit\u00e1nica", "100,000 ton", "Platino", "No"], bw);

subSubTitle("Relaciones con Clientes (10 badges)");
smallTableRow(["Nombre", "Criterio", "Tier", "Hidden?"], bw, true, RED);
smallTableRow(["Primer Contacto", "Crear 1 cliente", "Acero", "No"], bw);
smallTableRow(["Red en Expansi\u00f3n", "10 clientes", "Cobre", "No"], bw);
smallTableRow(["Rolodex de Acero", "25 clientes", "Plata", "No"], bw);
smallTableRow(["Embajador Industrial", "50 clientes", "Oro", "No"], bw);
smallTableRow(["Cliente Fiel", "10 \u00f3rdenes mismo cliente", "Cobre", "No"], bw);
smallTableRow(["Socio Estrat\u00e9gico", "50 \u00f3rdenes mismo cliente", "Plata", "No"], bw);
smallTableRow(["Multimodal", "3 tipos de transporte", "Cobre", "No"], bw);
smallTableRow(["Diversificador", "10 clientes/semana", "Plata", "No"], bw);
smallTableRow(["Nunca Falla", "100% CUM en 20+ \u00f3rdenes", "Oro", "S\u00ed"], bw);
smallTableRow(["C\u00edrculo de Confianza", "5 clientes con 10+ CUM", "Oro", "No"], bw);

subSubTitle("Conocimiento de Producto (10 badges)");
smallTableRow(["Nombre", "Criterio", "Tier", "Hidden?"], bw, true, RED);
smallTableRow(["Cat\u00e1logo Iniciado", "1 producto", "Acero", "No"], bw);
smallTableRow(["Ingeniero de Producto", "10 productos", "Cobre", "No"], bw);
smallTableRow(["Maestro del Calibre", "5 gauges distintos", "Cobre", "No"], bw);
smallTableRow(["Esp. en Acabados", "3 finishes distintos", "Cobre", "No"], bw);
smallTableRow(["Todo Proceso", "Todos los tipos de proceso", "Plata", "No"], bw);
smallTableRow(["Rango Completo", "Min y max thickness", "Plata", "No"], bw);
smallTableRow(["Empaquetador Experto", "5 packaging codes", "Cobre", "No"], bw);
smallTableRow(["Conocedor de Grados", "10 grade_pn", "Plata", "No"], bw);
smallTableRow(["Enciclopedia de Acero", "50 productos full spec", "Oro", "No"], bw);
smallTableRow(["El Metalurgista", "Todos los grades", "Platino", "S\u00ed"], bw);

subSubTitle("Dominio del Sistema (11 badges)");
smallTableRow(["Nombre", "Criterio", "Tier", "Hidden?"], bw, true, RED);
smallTableRow(["Primer Login", "Primer inicio de sesi\u00f3n", "Acero", "No"], bw);
smallTableRow(["Exploraci\u00f3n Completa", "Visitar 5 secciones", "Acero", "No"], bw);
smallTableRow(["B\u00fasqueda Precisa", "10 b\u00fasquedas", "Acero", "No"], bw);
smallTableRow(["Simulador Activado", "Usar simulador 3D", "Acero", "No"], bw);
smallTableRow(["Operador Nocturno", "Actividad 22:00-06:00", "Cobre", "S\u00ed"], bw);
smallTableRow(["Madrugador", "Antes de 6 AM", "Cobre", "S\u00ed"], bw);
smallTableRow(["Semana Completa", "Login 7 d\u00edas seguidos", "Plata", "No"], bw);
smallTableRow(["Mes de Acero", "20+ logins en un mes", "Oro", "No"], bw);
smallTableRow(["Racha de 30", "30 d\u00edas consecutivos", "Oro", "No"], bw);
smallTableRow(["Racha de 100", "100 d\u00edas consecutivos", "Platino", "No"], bw);
smallTableRow(["Modo Oscuro", "Activar dark mode", "Acero", "S\u00ed"], bw);

subSubTitle("Consistencia y Dedicaci\u00f3n (10 badges)");
smallTableRow(["Nombre", "Criterio", "Tier", "Hidden?"], bw, true, RED);
smallTableRow(["Primera Semana", "7 d\u00edas desde signup, 3+ activos", "Acero", "No"], bw);
smallTableRow(["Primer Mes", "30 d\u00edas, 10+ activos", "Cobre", "No"], bw);
smallTableRow(["Veterano Trimestral", "90 d\u00edas, 30+ activos", "Plata", "No"], bw);
smallTableRow(["Aniversario de Acero", "365 d\u00edas", "Oro", "No"], bw);
smallTableRow(["Mejor Semana Personal", "Superar record semanal", "Plata", "No"], bw);
smallTableRow(["Mejor Mes Personal", "Superar record mensual", "Oro", "No"], bw);
smallTableRow(["Sin Pausa", "1+ orden cada d\u00eda laboral x2 sem", "Plata", "No"], bw);
smallTableRow(["Multi-Planta", "3 plantas en un d\u00eda", "Cobre", "No"], bw);
smallTableRow(["El Incansable", "50+ ton en un d\u00eda", "Oro", "S\u00ed"], bw);
smallTableRow(["Leyenda del Acero", "Desbloquear 50 logros", "Platino", "No"], bw);


// ══════════════════════════════════════════════════════════════
// 8. MASTERY PATHS
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("8. Mastery Paths (3 Caminos)");

bodyText("Tres caminos independientes de maestr\u00eda. El usuario progresa en los 3 simult\u00e1neamente. Se desbloquean en nivel 4.");

subTitle("Path 1: Comandante de Flujo de \u00d3rdenes");
const pw = [CW * 0.10, CW * 0.25, CW * 0.15, CW * 0.50];
tableRow(["Tier", "Nombre", "XP Dom.", "Criterio"], pw, true, RED);
tableRow(["1", "Order Initiate", "0", "Auto-desbloqueado"], pw);
tableRow(["2", "Order Handler", "150", "10+ \u00f3rdenes creadas"], pw);
tableRow(["3", "Pipeline Manager", "500", "25+ \u00f3rdenes CUM"], pw);
tableRow(["4", "Flow Architect", "1,200", "\u00d3rdenes en 3+ plantas"], pw);
tableRow(["5", "Order Flow Commander", "3,000", "95%+ rate CUM sobre 50+ \u00f3rdenes"], pw);

subTitle("Path 2: Experto en Relaciones con Clientes");
tableRow(["Tier", "Nombre", "XP Dom.", "Criterio"], pw, true, RED);
tableRow(["1", "Client Observer", "0", "Auto-desbloqueado"], pw);
tableRow(["2", "Account Handler", "100", "5+ clientes creados"], pw);
tableRow(["3", "Relationship Builder", "350", "Clientes con 3+ tipos transporte"], pw);
tableRow(["4", "Portfolio Specialist", "900", "Clientes con 50+ \u00f3rdenes total"], pw);
tableRow(["5", "Client Relations Expert", "2,000", "20+ clientes activos"], pw);

subTitle("Path 3: Especialista de Producto");
tableRow(["Tier", "Nombre", "XP Dom.", "Criterio"], pw, true, RED);
tableRow(["1", "Product Trainee", "0", "Auto-desbloqueado"], pw);
tableRow(["2", "Spec Technician", "120", "5+ productos creados"], pw);
tableRow(["3", "Catalog Builder", "400", "Productos con 3+ procesos"], pw);
tableRow(["4", "Quality Auditor", "1,000", "20+ productos editados"], pw);
tableRow(["5", "Product Specialist", "2,500", "Cobertura completa de procesos"], pw);


// ══════════════════════════════════════════════════════════════
// 9. ONBOARDING GAMIFICADO
// ══════════════════════════════════════════════════════════════
sectionTitle("9. Onboarding Gamificado (12 Misiones)");

bodyText(
  "Chain de misiones que se activa al primer login. Gu\u00eda al usuario por todas las features con narrativa sider\u00fargica. " +
  "Completar todo otorga 435 XP (llega a Rank 3)."
);

const ow = [CW * 0.06, CW * 0.20, CW * 0.42, CW * 0.10, CW * 0.22];
tableRow(["#", "Nombre", "Tarea", "XP", "D\u00f3nde"], ow, true, RED);
tableRow(["1", "First Spark", "Visitar Dashboard", "10", "Dashboard /"], ow);
tableRow(["2", "Know Your Forge", "Ver 4 KPI cards", "20", "Dashboard /"], ow);
tableRow(["3", "First Contact", "Navegar a Clientes", "15", "/clientes"], ow);
tableRow(["4", "The Ledger Opens", "Crear primer cliente", "50", "/clientes"], ow);
tableRow(["5", "Iron Catalogue", "Navegar a Productos", "15", "/productos"], ow);
tableRow(["6", "First Blueprint", "Crear primer producto", "50", "/productos"], ow);
tableRow(["7", "Furnace Ignites", "Navegar a \u00d3rdenes", "15", "/ordenes"], ow);
tableRow(["8", "First Pour", "Crear primera orden", "75", "/ordenes"], ow);
tableRow(["9", "The Crucible", "Usar Simulador 3D", "30", "/simulador"], ow);
tableRow(["10", "Weight Watcher", "Usar Calculadora Empaque", "25", "Dashboard sidebar"], ow);
tableRow(["11", "Flow Reader", "Ver gr\u00e1ficos de flujo", "30", "Dashboard charts"], ow);
tableRow(["12", "Forged in Steel", "Completar todo", "100", "Auto"], ow);


// ══════════════════════════════════════════════════════════════
// 10-12. CHALLENGES, QUESTS, SEASONAL EVENTS
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("10. Desaf\u00edos (Challenges)");

bodyText(
  "3 desaf\u00edos diarios + 2 semanales + 1 mensual asignados autom\u00e1ticamente. " +
  "El usuario puede 'reroll' 1 desaf\u00edo por d\u00eda. Ubicaci\u00f3n: Dashboard sidebar + p\u00e1gina /desafios."
);

const cw3 = [CW * 0.25, CW * 0.40, CW * 0.12, CW * 0.12, CW * 0.11];
tableRow(["Nombre", "Condici\u00f3n", "Tier", "Per\u00edodo", "XP"], cw3, true, RED);
tableRow(["Primer Flujo", "1 orden del d\u00eda", "Bronce", "Diario", "50"], cw3);
tableRow(["Cinco al D\u00eda", "5 \u00f3rdenes hoy", "Bronce", "Diario", "75"], cw3);
tableRow(["Triple Cierre", "3/3 anillos", "Bronce", "Diario", "100"], cw3);
tableRow(["Tonelaje del D\u00eda", "25+ toneladas hoy", "Bronce", "Diario", "75"], cw3);
tableRow(["Semana de Acero", "\u22651 anillo/d\u00eda x5", "Plata", "Semanal", "300"], cw3);
tableRow(["Semana Perfecta", "3/3 anillos x5 d\u00edas", "Plata", "Semanal", "500"], cw3);
tableRow(["Flujo Semanal 25", "25 \u00f3rdenes/semana", "Plata", "Semanal", "250"], cw3);
tableRow(["Maestro del Flujo", "100 \u00f3rdenes/mes", "Oro", "Mensual", "1000"], cw3);
tableRow(["Tit\u00e1n del Tonelaje", "1000 ton/mes", "Oro", "Mensual", "1500"], cw3);
tableRow(["Racha de 30", "30 d\u00edas streak", "Oro", "Mensual", "2500"], cw3);

sectionTitle("11. Quests Semanales y Mensuales");

bodyText("10 quests semanales + 10 mensuales rotativas. Se asignan 3 semanales (lunes) y 2 mensuales (d\u00eda 1). Narrativa sider\u00fargica.");

const qw = [CW * 0.25, CW * 0.50, CW * 0.12, CW * 0.13];
tableRow(["Quest", "Descripci\u00f3n", "XP", "Tipo"], qw, true, RED);
tableRow(["The Furnace Calls", "10 \u00f3rdenes esta semana", "80", "Weekly"], qw);
tableRow(["Client Wrangler", "3 nuevos clientes", "60", "Weekly"], qw);
tableRow(["Heavy Hauler", "50+ ton esta semana", "90", "Weekly"], qw);
tableRow(["Cross-Plant Runner", "3 plantas distintas", "75", "Weekly"], qw);
tableRow(["Dawn Shift", "Login antes 8 AM x3 d\u00edas", "60", "Weekly"], qw);
tableRow(["The Iron Harvest", "50 \u00f3rdenes este mes", "200", "Monthly"], qw);
tableRow(["Empire Builder", "10 clientes este mes", "150", "Monthly"], qw);
tableRow(["The Centurion", "100 \u00f3rdenes este mes", "400", "Monthly"], qw);
tableRow(["Weight Champion", "500+ ton este mes", "300", "Monthly"], qw);
tableRow(["The Perfectionist", "0 \u00f3rdenes PEN al cierre", "350", "Monthly"], qw);

sectionTitle("12. Eventos Estacionales");

bodyText("4 eventos al a\u00f1o, uno por trimestre. Cada uno dura 4 semanas con mini quests + cosm\u00e9ticos exclusivos + XP multiplier.");

const ew = [CW * 0.15, CW * 0.25, CW * 0.30, CW * 0.30];
tableRow(["Q", "Nombre", "Narrativa", "Reward Final"], ew, true, RED);
tableRow(["Q1", "The Deep Forge", "El invierno exige los hornos m\u00e1s calientes", "T\u00edtulo + marco ember animado"], ew);
tableRow(["Q2", "Steel Summit", "Cumbre anual de innovaci\u00f3n", "T\u00edtulo + marco gold cog"], ew);
tableRow(["Q3", "Inferno Season", "Pico de producci\u00f3n, calor implacable", "T\u00edtulo + marco llama"], ew);
tableRow(["Q4", "Master's Crucible", "Prueba definitiva de fin de a\u00f1o", "T\u00edtulo + marco diamante"], ew);

y += 2;
bodyText("XP multiplier durante eventos: 1.25x en Q1, 1.0x en Q2-Q3, 1.25x en Q4.");


// ══════════════════════════════════════════════════════════════
// 13-15. COSMETICS, RECORDS, RECAPS
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("13. Cosm\u00e9ticos Desbloqueables");

bodyText("Recompensas puramente est\u00e9ticas. Ning\u00fan advantage funcional. El usuario elige activos desde un panel de personalizaci\u00f3n.");

subTitle("Fondos de Dashboard (5)");
bulletList(["Default (actual)", "Deep Forge: gradiente volc\u00e1nico oscuro", "Steel Summit: textura metal cepillado", "Inferno: gradiente radial oscuro-naranja", "Crucible Dark: negro con textura diamond-plate"]);

subTitle("Temas de Sidebar (5)");
bulletList(["Default", "Obsidian Steel: negro puro + bordes rojos", "Molten Chrome: oscuro + acentos amber", "Blueprint Grid: navy oscuro + grid blanco", "Tempered Steel: gunmetal + acentos plata"]);

subTitle("Paletas de Acento (5)");
bulletList(["Default: #d41111 (rojo actual)", "Frostfire: #3B82F6 (azul fr\u00edo)", "Summit Gold: #F59E0B (amber)", "Solar Flare: #EF4444 (rojo-naranja)", "Forgemaster: #8B5CF6 (p\u00farpura)"]);

subTitle("Marcos de Avatar (6)");
bulletList(["Default: c\u00edrculo simple", "Deep Forge Veteran: part\u00edculas ember", "Summit Champion: anillo oro con dientes", "Inferno Survivor: anillo de llama", "Crucible Master: borde facetado diamante", "Master of the Forge: anillo acero fundido (Rank 12)"]);

sectionTitle("14. Records Personales");

bodyText("11 tipos de records que el usuario compite contra s\u00ed mismo.");

const rcw = [CW * 0.30, CW * 0.35, CW * 0.35];
tableRow(["Record", "M\u00e9trica", "Display"], rcw, true, RED);
tableRow(["Mejor D\u00eda (\u00d3rdenes)", "Max \u00f3rdenes en un d\u00eda", "\"12 \u00f3rdenes (15 Mar 2026)\""], rcw);
tableRow(["Mejor D\u00eda (Tonelaje)", "Max toneladas en un d\u00eda", "\"47.3T (28 Feb 2026)\""], rcw);
tableRow(["Mejor Semana", "Max \u00f3rdenes Lun-Dom", "\"38 \u00f3rdenes (Sem 6 Abr)\""], rcw);
tableRow(["Mejor Mes (Ton)", "Max toneladas en mes", "\"891.2T (Enero 2026)\""], rcw);
tableRow(["Completion M\u00e1s R\u00e1pido", "Min tiempo orden\u2192CUM", "\"2h 14m (Orden #4821)\""], rcw);
tableRow(["Racha M\u00e1s Larga", "Max d\u00edas consecutivos", "\"47 d\u00edas\""], rcw);
tableRow(["M\u00e1s Clientes/D\u00eda", "Max clientes en un d\u00eda", "\"8 (3 Abr 2026)\""], rcw);
tableRow(["Orden M\u00e1s Pesada", "Max net_weight_ton", "\"34.7T (Orden #7712)\""], rcw);

sectionTitle("15. Recaps Semanales");

bodyText(
  "Generados cada domingo a las 20:00. Contienen: stats personales, rendimiento de anillos, " +
  "estado de racha, heatmap semanal, desaf\u00edos completados, records rotos. " +
  "Se muestran como notificaci\u00f3n en dashboard el lunes + email opcional."
);


// ══════════════════════════════════════════════════════════════
// 16. UI MAP
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("16. Mapa de UI \u2014 D\u00f3nde Va Cada Elemento");

subTitle("16.1 Dashboard (/ \u2014 page.tsx)");
const uw = [CW * 0.30, CW * 0.70];
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Sidebar derecho, ARRIBA", "Steel Rings widget (3 SVG conc\u00e9ntricos + racha)"], uw);
tableRow(["Sidebar derecho, MEDIO", "Desaf\u00edos del D\u00eda (3 progress bars)"], uw);
tableRow(["Izquierda, post-Charts", "NUEVO: Heatmap de actividad (12 meses)"], uw);
tableRow(["KPI Cards", "+5to KPI compacto: Racha actual con icono llama"], uw);
tableRow(["Fixed bottom-right", "Toast zone para XP / logros"], uw);

subTitle("16.2 Sidebar (SteelFlowShell.tsx)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["NAV_ITEMS", "+3: /progreso ('trending_up'), /misiones ('menu_book'), /desafios ('local_fire_department')"], uw);
tableRow(["Card inferior", "Mini anillos (24x24px) + nivel badge + racha count"], uw);

subTitle("16.3 Header (SteelFlowHeader.tsx)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Junto a avatar", "Pill badge: 'Lv.{N}' + racha flame"], uw);
tableRow(["Notification bell", "Red dot cuando anillos >80% o recap no le\u00eddo"], uw);
tableRow(["User menu dropdown", "+Mi Perfil, +Mis Logros (32/55), +Personalizar"], uw);

subTitle("16.4 \u00d3rdenes (/ordenes \u2014 OrdersWorkspace.tsx)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Post-create order", "awardXP('order_created') + ring increment + toast"], uw);
tableRow(["KPI 'Total orders'", "Mini progress bar hacia pr\u00f3ximo milestone"], uw);
tableRow(["Subt\u00edtulo", "Mastery chip: 'Order Flow Commander \u2014 Tier 3/5'"], uw);

subTitle("16.5 Clientes (/clientes \u2014 ClientsDirectory.tsx)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Post-create client", "awardXP('client_created') + ring increment"], uw);
tableRow(["Stats row", "+5to stat: 'Client Relations \u2014 Tier {N}'"], uw);

subTitle("16.6 Productos (/productos \u2014 ProductsWorkspace.tsx)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Post-create/edit", "awardXP + ring increment"], uw);
tableRow(["Stats row", "+5to stat: 'Product Specialist \u2014 Tier {N}'"], uw);

subTitle("16.7 Simulador (/simulador)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Debajo del t\u00edtulo", "Session XP tracker: 'XP esta sesi\u00f3n: {N}'"], uw);

subTitle("16.8 Login (login/page.tsx)");
tableRow(["\u00c1rea", "Cambio"], uw, true, RED);
tableRow(["Post-login redirect", "Toast: 'D\u00eda {N} de tu racha +10 XP'"], uw);


// ══════════════════════════════════════════════════════════════
// 17. SQL SCHEMA SUMMARY
// ══════════════════════════════════════════════════════════════
doc.addPage(); y = MT;
sectionTitle("17. Schema SQL (18 Tablas)");

bodyText(
  "El archivo gamification-schema.sql contiene todas las tablas, indexes, RLS policies y seed data. " +
  "A continuaci\u00f3n el resumen de cada tabla:"
);

const sqlw = [CW * 0.30, CW * 0.70];
tableRow(["Tabla", "Prop\u00f3sito"], sqlw, true, RED);
tableRow(["level_definitions", "12 niveles con t\u00edtulos EN/ES, XP requerido, perks"], sqlw);
tableRow(["user_profiles", "Estado central: XP, nivel, racha, ring targets, cosm\u00e9ticos activos, prefs"], sqlw);
tableRow(["xp_events", "Ledger inmutable de transacciones XP (acci\u00f3n, monto, fuente)"], sqlw);
tableRow(["user_activity_log", "Log granular de acciones (login, create, view, search, etc.)"], sqlw);
tableRow(["daily_activity", "1 row/user/d\u00eda: rings, heatmap, streak, contadores detallados"], sqlw);
tableRow(["streak_history", "Historial de rachas (inicio, fin, duraci\u00f3n, raz\u00f3n de quiebre)"], sqlw);
tableRow(["achievement_definitions", "Cat\u00e1logo de 55 logros con criteria JSONB"], sqlw);
tableRow(["user_achievements", "Badges ganados por usuario (con featured flag)"], sqlw);
tableRow(["user_achievement_progress", "Progreso incremental hacia badges no desbloqueados"], sqlw);
tableRow(["mastery_paths", "3 paths por usuario: tier actual, domain XP"], sqlw);
tableRow(["quest_definitions", "Cat\u00e1logo de quests: onboarding + weekly + monthly + seasonal"], sqlw);
tableRow(["user_quests", "Quests activas/completadas por usuario"], sqlw);
tableRow(["challenge_definitions", "Cat\u00e1logo de desaf\u00edos (daily/weekly/monthly)"], sqlw);
tableRow(["user_challenges", "Desaf\u00edos asignados con progreso"], sqlw);
tableRow(["user_cosmetics", "Cosm\u00e9ticos desbloqueados (tipo + valor)"], sqlw);
tableRow(["user_personal_records", "11 tipos de records personales"], sqlw);
tableRow(["seasonal_events", "Eventos trimestrales con multiplicador XP"], sqlw);
tableRow(["weekly_recaps", "Res\u00famenes semanales generados"], sqlw);

y += 4;
bodyText("Todas las tablas tienen Row Level Security habilitado. Los usuarios solo ven sus propios datos. " +
  "El trigger handle_new_user() crea autom\u00e1ticamente el perfil, mastery paths y onboarding quests al signup.");

infoCard("Nota sobre Auth", "El auth actual basado en cookie (steelflow-session) deber\u00e1 migrarse a Supabase Auth completo para que las RLS policies funcionen con auth.uid().");


// ══════════════════════════════════════════════════════════════
// 18. NEW PAGES & COMPONENTS
// ══════════════════════════════════════════════════════════════
sectionTitle("18. Nuevas P\u00e1ginas y Componentes");

subTitle("18.1 P\u00e1ginas Nuevas");
const nw = [CW * 0.20, CW * 0.80];
tableRow(["Ruta", "Contenido"], nw, true, RED);
tableRow(["/progreso", "Perfil hero, XP chart 30d, 3 mastery trees, badge grid, activity feed, level roadmap"], nw);
tableRow(["/misiones", "Quest journal: activas (weekly+monthly+seasonal), onboarding progress, historial, narrativa"], nw);
tableRow(["/desafios", "Desaf\u00edos activos (3 daily + 2 weekly + 1 monthly), historial, bot\u00f3n reroll"], nw);

subTitle("18.2 Componentes Nuevos");
const nw2 = [CW * 0.35, CW * 0.65];
tableRow(["Componente", "Descripci\u00f3n"], nw2, true, RED);
tableRow(["XPToast.tsx", "Toast animado bottom-right: '+25 XP \u2014 Orden Creada' (auto-dismiss 3s)"], nw2);
tableRow(["SteelRings.tsx", "3 SVG conc\u00e9ntricos con animaci\u00f3n de fill + triple cierre"], nw2);
tableRow(["ProgressCard.tsx", "Card compacto para sidebar: nivel + XP bar + racha"], nw2);
tableRow(["MasteryPathView.tsx", "Skill tree vertical: 5 nodos (locked/progress/complete)"], nw2);
tableRow(["ActivityHeatmap.tsx", "Grid 52x7 con 5 niveles de color + tooltip"], nw2);
tableRow(["AchievementGrid.tsx", "Grid de badges: unlocked (color) / locked (gris) / hidden (?)"], nw2);
tableRow(["QuestJournal.tsx", "Lista de quests activas con progress bars + narrativa"], nw2);
tableRow(["QuestProgressPill.tsx", "Pill flotante bottom-right: 'Forging Your Path: 4/12'"], nw2);
tableRow(["SpotlightOverlay.tsx", "Highlight pulsante en UI elements durante onboarding"], nw2);
tableRow(["MilestoneOverlay.tsx", "Full-screen celebraci\u00f3n (level up, badge earned, milestone)"], nw2);
tableRow(["WeeklyRecapModal.tsx", "Overlay con resumen semanal (stats, anillos, records)"], nw2);
tableRow(["ForgeCustomization.tsx", "Modal para seleccionar cosm\u00e9ticos activos"], nw2);

subTitle("18.3 Archivos de L\u00f3gica");
tableRow(["Archivo", "Descripci\u00f3n"], nw2, true, RED);
tableRow(["lib/gamification.ts", "awardXP(), checkLevel(), checkBadges(), checkMastery()"], nw2);
tableRow(["lib/hooks/useGamification.ts", "React hook: perfil, XP, nivel, rachas"], nw2);
tableRow(["lib/hooks/useQuests.ts", "React hook: quests activas, progreso"], nw2);
tableRow(["types/gamification.ts", "TypeScript types para todas las tablas de gamificaci\u00f3n"], nw2);
tableRow(["GamificationProvider.tsx", "React context wrapping app: estado global de gamificaci\u00f3n"], nw2);


// ══════════════════════════════════════════════════════════════
// FOOTERS
// ══════════════════════════════════════════════════════════════
const pages = doc.internal.getNumberOfPages();
for (let i = 2; i <= pages; i++) {
  doc.setPage(i);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LIGHT_GRAY);
  doc.text("SteelFlow Pro \u2014 Plan de Gamificaci\u00f3n No-Competitiva", ML, H - 10);
  doc.text(`${i} / ${pages}`, W - MR, H - 10, { align: "right" });
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(0, 3, W, 3);
}

// ── Save ──
const buffer = doc.output("arraybuffer");
fs.writeFileSync("Plan_Gamificacion_SteelFlow.pdf", Buffer.from(buffer));
console.log("\u2705 PDF generado: Plan_Gamificacion_SteelFlow.pdf (" + pages + " p\u00e1ginas)");
