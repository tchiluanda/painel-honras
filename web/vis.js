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
    left: 200
};

const duracao = 1000;
const cor_padrao = "#444";

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

    const subtotais = {};
    const dominios = {};
    const maximos = [];
    for (variavel of variaveis_de_interesse) {
        subtotais[variavel] = group_by_sum(dados, variavel, "valor", true);
        dominios[variavel] = subtotais[variavel].map(d => d.categoria);
        const maximo = d3.max(subtotais[variavel], d => d.subtotal);
        maximos.push(maximo);
    };

    console.log(subtotais, maximos);

    const max_valor = d3.max(maximos);

    // dentro da funcao de desenhar

    // escalas

    // vai mudar
    let y = d3.scaleBand()
        .domain(dominios["mutuario"])
        .range([margin.top, +h.slice(0, h.length-2) - margin.bottom]);

    let color = d3.scaleOrdinal()
        .domain(dominios["Credor"])
        .range(d3.schemeTableau10.concat(d3.schemeSet3));

    // fixa
    const tamanho = d3.scaleLinear()
        .domain([0, max_valor])
        .range([0, +w.slice(0, w.length-2) - margin.left - margin.right]);

    const x = d3.scaleLinear()
        .domain([0, max_valor])
        .range([margin.left, +w.slice(0, w.length-2) - margin.right]);

    let eixo_y = d3.axisLeft()
        .scale(y)

    // inclui eixo y
    let $eixo_y = svg_prin
        .append("g") 
            .attr("class", "axis y-axis")
            .attr("transform", "translate(" + margin.left + ",-2)")
        .call(eixo_y);

    let rect_principal = svg_prin
        .selectAll("rect")
        .data(dados);

    const rect_principal_enter = svg_prin
        .selectAll("rect")
        .data(dados)
        .enter()
        .append("rect")
        .attr("x", d => x(+d.pos_ini_mutuario))
        .attr("y", d => y(d.mutuario))
        .attr("width", d => tamanho(+d.valor) + 1)
        .attr("height", y.bandwidth() * 0.75)
        .attr("stroke-width", 0)
        .attr("fill", cor_padrao);
    
    rect_principal = rect_principal.merge(rect_principal_enter);

    function desenha_principal(categoria) {
        const color = d3.scaleOrdinal()
            .domain(dominios[categoria])
            .range(d3.schemeTableau10.concat(d3.schemeSet3));

        const y = d3.scaleBand()
            .domain(dominios[categoria])
            .range([margin.top, +h.slice(0, h.length-2) - margin.bottom]);

        const novo_eixo = d3.axisLeft().scale(y);

        $eixo_y
          .transition()
          .delay(duracao)
          .duration(duracao*2)
          .call(novo_eixo);

        console.log("Dentro funcao desenho, checa escala y", color(dados[0][categoria]));

        rect_principal
          .transition()
          .duration(duracao)
          .attr("fill", d => color(d[categoria]))
          .transition()
          .delay(duracao)
          .duration(duracao)
          .attr("x", d => x(+d["pos_ini_"+categoria]))
          .attr("y", d => y(d[categoria]))
          .attr("height", y.bandwidth() * 0.75)
          .transition()
          .delay(duracao*2)
          .duration(duracao)
          .attr("fill", cor_padrao)
          

    }

    const $botoes_categorias = d3.selectAll("nav.js--controle-categoria > button");

    console.log($botoes_categorias);

    $botoes_categorias.on("click", function(){
     
      const opcao = this.id;

      $botoes_categorias.classed("selected", false);
      d3.select(this).classed("selected", true);

      console.log(opcao, this.id, this);

      desenha_principal(opcao);
    })
})