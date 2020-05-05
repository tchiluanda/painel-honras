const $ultima_data = d3.select("span.js--ultima-data");
const $qde_honras  = d3.select("strong.js--qde-honras");

const altura_logo = d3.select("header.logo").node().offsetHeight;
const altura_header = d3.select("main>header").node().offsetHeight;
const altura_nav = d3.select("div.grupo-controles").node().offsetHeight;
const altura_janela = window.innerHeight;

const altura_container_vis = altura_janela - altura_logo - altura_header - altura_nav;
// atenção! a margen não entra nesse cálculo, então é importante zerar as margens verticais entre os elementos sendo medidos.
console.log(altura_container_vis);
d3.select(".vis-container").style("height", altura_container_vis + "px");


const svg_prin = d3.select("svg.vis-principal");

const margin = {
    top : 10,
    right : 10,
    bottom: 10,
    left: 40
};

const h = svg_prin.style("height");
const w = svg_prin.style("width");

function desenha_principal() {
    const h = svg_prin.style("height");
    const w = svg_prin.style("width");

    // scales
}

function init() {

}

d3.csv("dados/dados.csv").then(function(dados) {
    console.log(dados.columns);
    // ["", "data", "tipo_divida", "Credor", "contrato", "tipo_credor", "mutuario", "tipo_mutuario", "Status", "valor", "mes", "ano", "mes_ano", "data_mes", "pos_ini_mutuario", "pos_ini_Credor", "pos_ini_tipo_divida", "pos_ini_ano"]

    // monta um objeto com os subtotais por categoria

    const variaveis_de_interesse = ["mutuario", "Credor", "tipo_divida", "ano"];

    const sumarios = {};
    const maximos = [];
    for (variavel of variaveis_de_interesse) {
        sumarios[variavel] = group_by_sum(dados, variavel, "valor", true);
        const maximo = d3.max(sumarios[variavel], d => d.subtotal);
        maximos.push(maximo);
    };

    console.log(sumarios, maximos);

    const max_valor = d3.max(maximos);

    // dentro da funcao de desenhar

    const dominio = sumarios["mutuario"].map(d => d.categoria);

    // escalas
    const y = d3.scaleBand()
        .domain(dominio)
        .rangeRound([margin.top, +h.slice(0, h.length-2) - margin.bottom]);

    const tamanho = d3.scaleLinear()
        .domain([0, max_valor])
        .range([0, +w.slice(0, w.length-2) - margin.left - margin.right]);

    const x = d3.scaleLinear()
        .domain([0, max_valor])
        .range([margin.left, +w.slice(0, w.length-2) - margin.right]);


    const rect = svg_prin
    .selectAll("rect")
    .data(dados)
    .enter()
    .append("rect")
    .attr("x", d => x(+d.pos_ini_mutuario))
    .attr("y", d => y(d.mutuario))
    .attr("width", d => tamanho(+d.valor))
    .attr("height", y.bandwidth() * 0.75);


})