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