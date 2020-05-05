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

const margins = {
    top : 10,
    right : 10,
    bottom: 10,
    left: 10
}

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

    console.log(group_by_sum(dados, "mutuario", "valor", true));
})