const $ultima_data = d3.select("span.js--ultima-data");
const $qde_honras  = d3.select("strong.js--qde-honras");

///////////////////////////////////////////////////
// define tamanho do container do grid

const altura_logo = d3.select("header.logo").node().offsetHeight;
const altura_header = d3.select("main>header").node().offsetHeight;
const altura_nav = d3.select("div.grupo-controles").node().offsetHeight;
const altura_janela = window.innerHeight;

const altura_container_vis = altura_janela - altura_logo - altura_header - altura_nav;
// atenção! a margen não entra nesse cálculo, então é importante zerar as margens verticais entre os elementos sendo medidos.
//console.log(altura_container_vis);
d3.select(".vis-container").style("height", altura_container_vis + "px");

// agora temos as dimensoes necessarias para cada svg nesse objeto `dimensoes`

function init() {

}

d3.csv("dados/dados.csv").then(function(dados) {
    console.log(dados.columns);
    // ["", "data", "tipo_divida", "Credor", "contrato", "tipo_credor", "mutuario", "tipo_mutuario", "Status", "valor", "mes", "ano", "mes_ano", "data_mes", "pos_ini_mutuario", "pos_ini_Credor", "pos_ini_tipo_divida", "pos_ini_ano"]

    ///////////////////////////////////////////////////
    // monta um objeto com parâmetros dos dados brutos

    const variaveis_de_interesse = ["mutuario", "Credor", "tipo_divida", "ano"];

    const parametros = {
        _maximos : [],
        _quantidades : []
    };
    
    for (variavel of variaveis_de_interesse) {

        // subtotais[variavel]

        const subtotal = group_by_sum(dados, variavel, "valor", variavel != "ano"); 
        // vai dar true para todas as variáveis, exceto para o "ano", quando não quero ordenar por valor decrescente, mas sim pela ordem dos anos.

        const maximo = d3.max(subtotal, d => d.subtotal);

        const quantidade = subtotal.length;

        parametros[variavel] = {
            subtotais : subtotal,
            dominios  : subtotal.map(d => d.categoria),
            maximo : maximo,
            quantidade : quantidade
        };

        parametros._maximos.push(maximo);
        parametros._quantidades.push(quantidade);

    };

    console.log(parametros);

    ///////////////////////////////////////////////////
    // parâmetros gerais

    const max_valor = d3.max(parametros._maximos);
    const max_quantidade = d3.max(parametros._quantidades);
    const duracao = 700;
    const cor_padrao = d3.select(":root").style("--cor-escura");
    const cor_destaque = "coral";

    ///////////////////////////////////////////////////
    // referencias, margens e dimensões dos svgs

    const svg_prin = d3.select("svg.vis-principal");
    const svg_aux1 = d3.select("svg.vis-auxiliar1");
    const svg_aux2 = d3.select("svg.vis-auxiliar2");
    const svg_time = d3.select("svg.vis-timeline");

    const classes = ["principal", "auxiliar1", "auxiliar2", "timeline"];

    const margens = {
        principal : {
            top : 10,
            right : 50,
            bottom: 10,
            left: 140
        },
        
        auxiliar1 : { 
            top : 10,
            right: 20,
            bottom: 10,
            left: 60
        },

        auxiliar2 : { 
            top : 10,
            right: 20,
            bottom: 10,
            left: 60
        },

        timeline : {
            top : 10,
            right: 20,
            bottom: 10,
            left: 20
        }
    };

    function pega_dimensoes(classe_svg) {
        const svg = d3.select("svg.vis-" + classe_svg);
        const margem = margens[classe_svg];

        const h = svg.style("height");
        const w = svg.style("width");
        const h_numerico = +h.slice(0, h.length-2);
        const w_numerico = +w.slice(0, w.length-2);

        const altura_liquida  = h_numerico - margem.top  - margem.bottom;
        const largura_liquida = w_numerico - margem.left - margem.right;

        const altura_barras = (h_numerico - margem.bottom - margem.top) / max_quantidade;

        return({
            "h": h, 
            "w": w, 
            "h_numerico" : h_numerico, 
            "w_numerico" : w_numerico, 
            "altura_liquida" : altura_liquida,
            "largura_liquida" : largura_liquida,
            "altura_barras" : altura_barras,
            // escalas: a escala de y depender da categoria selecionada e do svg; as escalas de x e w vão depender só do svg, o seu domínio é o mesmo para qualquer categoria e svg, então já vão ficar definidas aqui.
            "y_scale" : d3.scaleBand().range(),
            "x_scale" : d3.scaleLinear()
                          .domain([0, max_valor])
                          .range([margem.left, w_numerico - margem.right]),
            "w_scale" : d3.scaleLinear()
                          .domain([0, max_valor])
                          .range([0, w_numerico - margem.left - margem.right]),
            "eixo_y" : null,
        });
    }

    const dimensoes = {};

    for (classe of classes) {
        dimensoes[classe] = pega_dimensoes(classe)
    }

    console.log(dimensoes);    


    ///////////////////////////////////////////////////
    // escala de cor

    const color = d3.scaleOrdinal()
        .range(d3.schemeTableau10.concat(d3.schemeSet3));

    ///////////////////////////////////////////////////
    // inicializa eixos y        

    function cria_eixos_y(classe_svg) {
        const eixo_y = d3.axisLeft().scale(dimensoes[classe_svg].y_scale);

        dimensoes[classe_svg].eixo_y = d3.select("svg.vis-" + classe_svg)
            .append("g") 
                .classed("axis", true)
                .classed("y-axis", true)
                .attr("transform", "translate(" + margin.left + ",-2)")
            .call(eixo_y[classe]);
    };

    classes.forEach(d => cria_eixos_y(d));

    ///////////////////////////////////////////////////
    // cria os rects para cada honra    

    function cria_rects_honras() {

        let rects_honras = svg_prin
            .selectAll("rect.honras")
            .data(dados);

        const rects_honras_enter = svg_prin
            .selectAll("rect.honras")
            .data(dados)
            .enter()
            .append("rect")
            .classed("honras", true)
            .attr("x", w_numerico/2)
            .attr("y", h_numerico/2)
            .attr("width", 0)
            //.attr("height", y.bandwidth() * 0.75)
            .attr("height", 0)
            .attr("stroke-width", 0)
            .attr("fill", cor_padrao);
            // .attr("x", d => x(+d.pos_ini_mutuario))
            // .attr("y", d => y(d.mutuario))
            // .attr("width", d => wScale(+d.valor) + 1)
            // //.attr("height", y.bandwidth() * 0.75)
            // .attr("height", 0.75 * altura_barras)
            // .attr("stroke-width", 0)
            // .attr("fill", cor_padrao);
        
        rects_honras = rects_honras.merge(rects_honras_enter);

        return rects_honras;
    }

    const rects_honras = cria_rects_honras();

    ///////////////////////////////////////////////////
    // funcões para desenhar as barras

    function desenha_subtotais(classe_svg, categoria, variavel_destaque, valor_destaque) {

        if (destaque) {
            const data = group_by_sum(dados
                .filter(d => d[variavel_destaque] == valor_destaque))
            const cor_barra = cor_destaque;
        }
        
        // remove as barras de subtotais

        d3.select("svg.vis-" + classe_svg)
            .selectAll("rect.subtotais")
            .remove();
    
        // inclui as barras de subtotais por cima

        d3.select("svg.vis-" + classe_svg)
            .selectAll("rect.subtotais")
            .data(parametros[categoria].subtotais)
            .enter()
            .append("rect")
            .classed(rect_class, true)
            .attr("x", d => x_scale(0))
            .attr("y", d => y_scale(d.categoria))
            .attr("height", 0.75 * altura_barras)
            .attr("width", d => w_scale(d.subtotal) + 1)
            .attr("fill", cor_padrao)
            .attr("stroke", cor_padrao)
            .attr("stroke-width", rect_class == "principal" ? 2 : 0)
            .attr("opacity", 0)
            .transition()
            .delay(duracao*3)
            .duration(duracao)
            .attr("opacity", 1);  
        
        // labels

        svg_prin.selectAll("text."+rect_class+"-labels")
            .remove()

        svg_prin.selectAll("text."+rect_class+"-labels")
            .data(parametros[categoria].subtotais)
            .enter()
            .append("text")
            .classed(rect_class+"-labels", true)
            .attr("x", d => x_scale(d.subtotal) + 5)
            .attr("y", d => y_scale(d.categoria) + altura_barras/2)
            .text(d => valor_formatado(d.subtotal))
            .attr("opacity", 0)
            .transition()
            .delay(duracao*3)
            .duration(duracao)
            .attr("opacity", 1); 

    }

    function define_eixo_y(categoria, classe_svg) {
        // preciso dessa função pq o eixo_y vai depennder da categoria selecionada (mutuário, credor etc.) -- o que vai afetar o domínio, e do svg onde ele vai ser usado, o que vai afetar o range.
    }


    function desenha_principal(categoria) {

        // ajusta escalas

        color.domain(parametros[categoria].dominios)

        let altura_necessaria_barras = altura_barras * parametros[categoria].quantidade;

        let nova_margem_vertical = (h_numerico - altura_necessaria_barras) / 2

        const y = d3.scaleBand()
          .range([nova_margem_vertical, h_numerico - nova_margem_vertical])
          .domain(parametros[categoria].dominios);

        // atualiza eixo

        const novo_eixo = d3.axisLeft().scale(y);

        $eixo_y
          .transition()
          .delay(duracao)
          .duration(duracao*2)
          .call(novo_eixo);

        // atualiza os retangulos

        rects_honras
          .attr("height", 0.75 * altura_barras)
          .attr("width", d => wScale(+d.valor) + 1)
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
          .delay(duracao)
          .duration(duracao)
          .attr("fill", cor_padrao)

        desenha_subtotais();
       
    }

    desenha_principal("mutuario")

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