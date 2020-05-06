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
const h_numerico = +h.slice(0, h.length-2);
const w_numerico = +w.slice(0, w.length-2);
const altura_liquida = h_numerico - margin.top - margin.bottom;

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

    // monta um objeto com parâmetros dos dados brutos

    const variaveis_de_interesse = ["mutuario", "Credor", "tipo_divida", "ano"];

    const parametros = {
        _maximos : [],
        _comprimentos : []
    };
    
    for (variavel of variaveis_de_interesse) {

        // subtotais[variavel]

        const subtotal = group_by_sum(dados, variavel, "valor", true);

        const maximo = d3.max(subtotal, d => d.subtotal);

        const comprimento = subtotal.length;

        parametros[variavel] = {
            subtotais : subtotal,
            dominios  : subtotal.map(d => d.categoria),
            maximo : maximo,
            comprimento : comprimento
        };

        parametros._maximos.push(maximo);
        parametros._comprimentos.push(comprimento);

    };

    console.log(parametros);

    const max_valor = d3.max(parametros._maximos);
    const max_comprimento = d3.max(parametros._comprimentos);

    // dentro da funcao de desenhar

    // escalas

    // vai mudar
    let y = d3.scaleBand()
        .domain(parametros["mutuario"].dominios)
        .range([margin.top, +h.slice(0, h.length-2) - margin.bottom]);

    console.log("Y", y.range(), y.bandwidth(), y.domain().length);

    let color = d3.scaleOrdinal()
        .range(d3.schemeTableau10.concat(d3.schemeSet3));

    // fixa
    const wScale = d3.scaleLinear()
        .domain([0, max_valor])
        .range([0, w_numerico - margin.left - margin.right]);

    const x = d3.scaleLinear()
        .domain([0, max_valor])
        .range([margin.left, w_numerico - margin.right]);

    let eixo_y = d3.axisLeft()
        .scale(y)

    let altura_barras = (y.range()[1] - y.range()[0]) / max_comprimento;

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
        .attr("width", d => wScale(+d.valor) + 1)
        //.attr("height", y.bandwidth() * 0.75)
        .attr("height", 0.75 * altura_barras)
        .attr("stroke-width", 0)
        .attr("fill", cor_padrao);
    
    rect_principal = rect_principal.merge(rect_principal_enter);

    function desenha_principal(categoria) {
        // const color = d3.scaleOrdinal()
        //     .domain(dominios[categoria])
        //     .range(d3.schemeTableau10.concat(d3.schemeSet3));
        color.domain(parametros[categoria].dominios)

        // const y = d3.scaleBand()
        //     .domain(parametros[categoria].dominios)
        //     .range([margin.top, +h.slice(0, h.length-2) - margin.bottom]);

        const altura_necessaria_barras = altura_barras * parametros[categoria].comprimento;

        const nova_margem_vertical = (h_numerico - altura_necessaria_barras) / 2

        y
         .range([nova_margem_vertical, h_numerico - nova_margem_vertical])
         .domain(parametros[categoria].dominios);

        const novo_eixo = d3.axisLeft().scale(y);

        $eixo_y
          .transition()
          .delay(duracao)
          .duration(duracao*2)
          .call(novo_eixo);

        rect_principal
          .transition()
          .duration(duracao)
          .attr("fill", d => color(d[categoria]))
          .transition()
          .delay(duracao)
          .duration(duracao)
          .attr("x", d => x(+d["pos_ini_"+categoria]))
          .attr("y", d => y(d[categoria]))
          //.attr("height", y.bandwidth() * 0.75)
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