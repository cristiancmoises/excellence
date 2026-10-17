import { blankWorkbook } from "./shared.mjs";
function table(name, rows) {
  const s = blankWorkbook(name)[0];
  s.celldata = [];
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].length; c++) {
      const x = rows[r][c];
      s.celldata.push({
        r,
        c,
        v: {
          ff: "Arial",
          fs: 11,
          ...(typeof x === "string" && x.startsWith("=") ? { f: x } : { v: x }),
          ...(r === 0 ? { bl: 1, bg: "#155d47", fc: "#ffffff" } : {}),
          ...(r > 0 && (rows[r][0] === "Saldo" || String(rows[r][0]).startsWith("Total"))
            ? { bl: 1, bg: "#e8f3ef", fc: "#17352e" }
            : {}),
        },
      });
    }
  s.config = { columnlen: { 0: 190, 1: 150, 2: 150, 3: 150 } };
  return [s];
}
export const templates = {
  blank: {
    label: "Em branco",
    description: "Uma nova ideia começa aqui.",
    create: () => blankWorkbook(),
  },
  budget: {
    label: "Orçamento",
    description: "Receitas, despesas e saldo.",
    create: () =>
      table("Orçamento", [
        ["Categoria", "Planejado", "Realizado", "Diferença"],
        ["Receitas", 15000, 16200, "=C2-B2"],
        ["Equipe", 6500, 6200, "=B3-C3"],
        ["Infraestrutura", 1200, 1050, "=B4-C4"],
        ["Serviços", 850, 790, "=B5-C5"],
        ["Marketing", 600, 720, "=B6-C6"],
        ["Outros", 400, 280, "=B7-C7"],
        ["Total despesas", "=SUM(B3:B7)", "=SUM(C3:C7)", "=B8-C8"],
        ["Saldo", "=B2-B8", "=C2-C8", "=C9-B9"],
      ]),
  },
  inventory: {
    label: "Inventário",
    description: "Estoque e valor em tempo real.",
    create: () =>
      table("Inventário", [
        ["Produto", "Quantidade", "Valor unitário", "Valor total"],
        ["Notebook", 6, 4200, "=B2*C2"],
        ["Monitor", 12, 980, "=B3*C3"],
        ["Teclado", 20, 180, "=B4*C4"],
        ["Total", "", "", "=SUM(D2:D4)"],
      ]),
  },
  projects: {
    label: "Projetos",
    description: "Prioridades, horas e responsáveis.",
    create: () =>
      table("Projetos", [
        ["Tarefa", "Responsável", "Horas previstas", "Horas reais"],
        ["Planejamento", "Equipe", 8, 6],
        ["Desenvolvimento", "Equipe", 40, 32],
        ["Validação", "Equipe", 16, 12],
        ["Total", "", "=SUM(C2:C4)", "=SUM(D2:D4)"],
      ]),
  },
};
