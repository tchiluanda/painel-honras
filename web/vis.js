const $ultima_data = d3.select("span.js--ultima-data");
const $qde_honras  = d3.select("strong.js--qde-honras");

///////////////////////////////////////////////////
// define tamanho do container do grid

function dimensiona_container() {
    let altura_logo = d3.select("header.logo").node().offsetHeight;
    let altura_header = d3.select("main>header").node().offsetHeight;
    let altura_nav = d3.select("div.grupo-controles").node().offsetHeight;
    let altura_janela = window.innerHeight;

    let altura_container_vis = altura_janela - altura_logo - altura_header - altura_nav;
    // atenção! a margen não entra nesse cálculo, então é importante zerar as margens verticais entre os elementos sendo medidos.
    //console.log(altura_container_vis);
    d3.select(".vis-container").style("height", altura_container_vis + "px");
}

dimensiona_container();

// agora temos as dimensoes necessarias para cada svg nesse objeto `dimensoes`


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

    //console.log(parametros);

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
            top : 8,
            right: 30,
            bottom: 8,
            left: 90
        },

        auxiliar2 : { 
            top : 8,
            right: 30,
            bottom: 8,
            left: 90
        },

        timeline : {
            top : 20,
            right: 20,
            bottom: 30,
            left: 40
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
            "y_scale" : d3.scaleBand(),
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

    function dimensiona_vis() {
        for (classe of classes) {
            dimensoes[classe] = pega_dimensoes(classe)
        }
    }

    dimensiona_vis();
    console.log(dimensoes["timeline"]);

    //console.log(dimensoes);   

    ///////////////////////////////////////////////////
    // estados
    const estado = {
    
        mutuario : {
            auxiliar1 : "Credor",
            auxiliar2 : "tipo_divida"
        },

        Credor : {
            auxiliar1 : "mutuario",
            auxiliar2 : "tipo_divida"
        },

        tipo_divida : {
            auxiliar1 : "mutuario",
            auxiliar2 : "Credor"
        },

        ano : {
            auxiliar1 : "mutuario",
            auxiliar2 : "Credor"
        }

    }   


    ///////////////////////////////////////////////////
    // escala de cor

    const color = d3.scaleOrdinal()
        .range(d3.schemeTableau10.concat(d3.schemeSet3));

    ///////////////////////////////////////////////////
    // inicializa eixos y        

    function cria_eixos_y(classe_svg) {
        const eixo_y = d3.axisLeft().scale(dimensoes[classe_svg].y_scale);

        //console.log(eixo_y)

        dimensoes[classe_svg].eixo_y = d3.select("svg.vis-" + classe_svg)
            .append("g") 
                .classed("axis", true)
                .classed("y-axis", true)
                .attr("transform", "translate(" + margens[classe_svg].left + ",-2)")
            .call(eixo_y);
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
            .attr("x", dimensoes["principal"].w_numerico/2)
            .attr("y", dimensoes["principal"].h_numerico/2)
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

    function obtem_range_y(classe_svg, categoria) {
        const altura_necessaria_barras = dimensoes[classe_svg].altura_barras * parametros[categoria].quantidade;

        const nova_margem_vertical = (dimensoes[classe_svg].h_numerico - altura_necessaria_barras) / 2

        return([nova_margem_vertical, dimensoes[classe_svg].h_numerico - nova_margem_vertical])

    } 
    
    function desenha_eixo_y(classe_svg, y_scale) {
        // preciso dessa função pq o eixo_y vai depender da categoria selecionada (mutuário, credor etc.) -- o que vai afetar o domínio, e do svg onde ele vai ser usado, o que vai afetar o range.
        const novo_eixo = d3.axisLeft().scale(y_scale);

        d3.select("svg.vis-" + classe_svg)
          .select("g.axis")
          .classed(classe_svg, true)
          .transition()
          .delay(duracao)
          .duration(duracao*2)
          .call(novo_eixo);
    }

    function desenha_subtotais(classe_svg, categoria) {

        //console.log(classe_svg, categoria);

        const dados = parametros[categoria].subtotais;
        //console.log("dados dentro de subtotais", categoria, dados)
        const cor_barra = cor_padrao;
        //const classe_barra = "subtotais"

        const y_scale = dimensoes[classe_svg].y_scale
          .range(obtem_range_y(classe_svg, categoria))
          .domain(parametros[categoria].dominios);

        // se a função estiver sendo chamada para desenhar os gráficos auxiliares, será preciso criar / atualizar um novo eixo.
        if (classe_svg != "principal") {
            desenha_eixo_y(classe_svg, y_scale);
        }

        const x_scale = dimensoes[classe_svg].x_scale;
        const w_scale = dimensoes[classe_svg].w_scale;
        
        // remove as barras de subtotais preexistentes

        d3.select("svg.vis-" + classe_svg)
            .selectAll("rect." + classe_svg)
            .remove();
    
        // inclui as barras de subtotais por cima

        d3.select("svg.vis-" + classe_svg)
            .selectAll("rect." + classe_svg)
            .data(dados)
            .enter()
            .append("rect")
            .classed(classe_svg, true)
            .attr("x", d => x_scale(0))
            .attr("y", d => y_scale(d.categoria))
            .attr("height", 0.75 * dimensoes[classe_svg].altura_barras)
            .attr("width", d => w_scale(d.subtotal) + 1)
            .attr("fill", cor_padrao)
            .attr("stroke", cor_padrao)
            .attr("stroke-width", classe_svg == "principal" ? 2 : 0)
            .attr("opacity", 0)
            .transition()
            .delay(duracao*4)
            .duration(duracao)
            .attr("opacity", 1);  
        
        // labels

        d3.select("svg.vis-" + classe_svg).selectAll("text."+classe_svg+"-labels")
            .remove()

        d3.select("svg.vis-" + classe_svg).selectAll("text."+classe_svg+"-labels")
            .data(parametros[categoria].subtotais)
            .enter()
            .append("text")
            .classed(classe_svg+"-labels", true)
            .attr("x", d => x_scale(d.subtotal) + 5)
            .attr("y", d => y_scale(d.categoria) + dimensoes[classe_svg].altura_barras/2)
            .text(d => valor_formatado(d.subtotal))
            .attr("opacity", 0)
            .transition()
            .delay(duracao*3)
            .duration(duracao)
            .attr("opacity", 1); 

    }

    function desenha_destaques(classe_svg, variavel_destaque, valor_destaque) {

        data = group_by_sum(dados
            .filter(d => d[variavel_destaque] == valor_destaque))
        cor_barra = cor_destaque;
        classe_barra = "destaque";

    }

    function desenha_principal(categoria) {

        // ajusta escalas

        color.domain(parametros[categoria].dominios)

        const y_scale = d3.scaleBand()
          .range(obtem_range_y("principal", categoria))
          .domain(parametros[categoria].dominios);

        // atualiza eixo

        const novo_eixo = d3.axisLeft().scale(y_scale);

        d3.select("svg.vis-principal")
          .select("g.axis")
          .transition()
          .delay(duracao)
          .duration(duracao*2)
          .call(novo_eixo);

        // atualiza os retangulos

        rects_honras
          .attr("height", 0.75 * dimensoes["principal"].altura_barras)
          .attr("width", d => dimensoes["principal"].w_scale(+d.valor) + 1)
          .transition()
          .duration(duracao)
          .attr("fill", d => color(d[categoria]))
          .transition()
          .delay(duracao)
          .duration(duracao*1.5)
          .attr("x", d => dimensoes["principal"].x_scale(+d["pos_ini_"+categoria]))
          .attr("y", d => y_scale(d[categoria]))
          //.attr("height", y.bandwidth() * 0.75)
          .transition()
          .delay(duracao*1.5)
          .duration(duracao*1.5)
          .attr("fill", cor_padrao)

        desenha_subtotais("principal", categoria);
       
    }

    function desenha_timeline() {
        let dados_linha = group_by_sum(dados, "data_mes", "valor", false);


        dados_linha.forEach((d,i) => {
            dados_linha[i]["data"] = d3.timeParse("%Y-%m-%d")(d.categoria);
        });

        console.log(dados_linha);

        const valor_linha_max = d3.max(dados_linha, d => +d.subtotal);

        const y_scale = d3.scaleLinear()
            .range([dimensoes["timeline"].h_numerico - margens["timeline"].bottom, margens["timeline"].bottom])
            .domain([0, valor_linha_max]);

        const x_scale = d3.scaleTime()
            .range([margens["timeline"].left, dimensoes["timeline"].w_numerico - margens["timeline"].right])
            .domain(d3.extent(dados_linha, d => d.data));

        console.log(x_scale.range(), y_scale.range());

        const gerador_linha = d3.line()
            .x(d => x_scale(d.data))
            .y(d => y_scale(d.subtotal))
            .curve(d3.curveCatmullRom.alpha(0.5));

        console.log(dados_linha.map(d => y_scale(d.subtotal)));

        d3.select("svg.vis-timeline")
            .append("path")
            .attr("d", gerador_linha(dados_linha))
            .attr("fill", "none")
            .attr("stroke-width", "2px")
            .attr("stroke", "var(--cor-escura)");

        let eixo_x = d3.axisBottom()
            .scale(x_scale)
            .tickFormat(d => formataData(d))
            .ticks(d3.timeMonth.every(4));

        d3.select("svg.vis-timeline")
            .append("g") 
            .attr("class", "axis x-axis")
            .attr("transform", "translate(0," + (dimensoes["timeline"].h_numerico - margens["timeline"].bottom) + ")")
            .call(eixo_x);

        let eixo_y = d3.axisLeft()
            .scale(y_scale)
            .tickFormat(d => formataBR(d/1e6))
            .ticks(3);

        d3.select("svg.vis-timeline")
            .append("g") 
            .classed("axis", true)
            .classed("y-axis-timeline", true)
            .attr("transform", "translate(" + margens["timeline"].left + ",0)")
            .call(eixo_y);

        d3.select("svg.vis-timeline")
            .select(".y-axis-timeline .tick:last-of-type text").clone()
            .attr("x", 5)
            .attr("text-anchor", "start")
            .style("font-weight", "bold")
            .classed("timeline-titulo-eixoY", true)
            .text("Valores mensais (R$ mi)");
    }

    desenha_timeline();

    function desenha_estado_atual(opcao) {
        desenha_principal(opcao);
        desenha_subtotais("auxiliar1", estado[opcao].auxiliar1);
        desenha_subtotais("auxiliar2", estado[opcao].auxiliar2);
    }

    //////////////////////
    // para dar início!

    let ultimo_estado = "mutuario";

    // fiz essa função para poder amarrar um listener de tamanho da janela;

    function resize_init() {
        dimensiona_container();
        dimensiona_vis();
        desenha_estado_atual(ultimo_estado);
    }

    desenha_estado_atual(ultimo_estado);

    ///////////////////////
    // listener dos botões

    const $botoes_categorias = d3.selectAll("nav.js--controle-categoria > button");

    //console.log($botoes_categorias);

    $botoes_categorias.on("click", function(){
     
      const opcao = this.id;

      $botoes_categorias.classed("selected", false);
      d3.select(this).classed("selected", true);

      //console.log(opcao, this.id, this);
      ultimo_estado = opcao;

      desenha_estado_atual(opcao)
    });

    ///////////////////////
    // listener do resize

    window.addEventListener('resize', debounce(resize_init, 500));

    // d3.select("svg.vis-principal").selectAll("rect.principal").on("click", function(){console.log(d3.select(this).data())})

    // d3.select("svg.vis-principal").selectAll("g.axis text").attr("fill", (d,i) => d == "Goiás" ? "coral" : "blue")

})