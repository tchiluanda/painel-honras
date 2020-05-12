const $ultima_data = d3.select("span.js--ultima-data");
const $qde_honras  = d3.select("strong.js--qde-honras");

///////////////////////////////////////////////////
// define tamanho do container do grid

function dimensiona_container() {
    let altura_logo = d3.select("header.logo").node().offsetHeight;
    //let altura_header = d3.select("main>header").node().offsetHeight;
    let altura_nav = d3.select("div.grupo-controles").node().offsetHeight;
    let altura_janela = window.innerHeight;

    let altura_container_vis = altura_janela - altura_logo - altura_nav; //- altura_header 
    // atenção! a margen não entra nesse cálculo, então é importante zerar as margens verticais entre os elementos sendo medidos.
    //console.log(altura_container_vis);

    altura_container_vis = window.innerWidth < 1080 ? altura_container_vis * 1.5 : altura_container_vis;

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
            top : 8,
            right: 35,
            bottom: 8,
            left: 100
        },

        auxiliar2 : { 
            top : 8,
            right: 35,
            bottom: 8,
            left: 100
        },

        timeline : {
            top : 10,
            right: 20,
            bottom: 20,
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

        //const nova_margem_vertical = (dimensoes[classe_svg].h_numerico - altura_necessaria_barras) / 2

        //return([nova_margem_vertical, dimensoes[classe_svg].h_numerico - nova_margem_vertical])

        const nova_margem_vertical_inferior = dimensoes[classe_svg].h_numerico - altura_necessaria_barras - margens[classe_svg].top;

        return([margens[classe_svg].top, dimensoes[classe_svg].h_numerico - nova_margem_vertical_inferior]);

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

        let barras_subtotais = d3.select("svg.vis-" + classe_svg)
            .selectAll("rect." + classe_svg)
            .data(dados, d => d.categoria);

        barras_subtotais
            .exit()
            .remove();
    
        // inclui as barras de subtotais por cima
        // as lógicas tratam quando as barras de subtotais estão nos paineis auxiliares. nesses casos, não caro que apareçam, mas que cresçam (como efeito de entrada)

        barras_subtotais
            .enter()
            .append("rect")
            .classed(classe_svg, true)
            .attr("x", d => x_scale(0))
            .attr("y", d => y_scale(d.categoria))
            .attr("height", 0.75 * dimensoes[classe_svg].altura_barras)
            .attr("width", d => classe_svg != "principal" ? 0 : w_scale(d.subtotal) + 1)
            .classed("subtotais", true) // fill e stroke definido em classes
            .attr("stroke-width", classe_svg == "principal" ? 2 : 0)
            .attr("opacity", d => classe_svg != "principal" ? 1 : 0)
            .transition()
            .delay(duracao*4)
            .duration(duracao)
            .attr("opacity", 1)
            .attr("width", d => w_scale(d.subtotal) + 1);
        
        // labels

        d3.select("svg.vis-" + classe_svg)
            .selectAll("text."+classe_svg+"-labels")
            .remove();

        d3.select("svg.vis-" + classe_svg)
            .selectAll("text."+classe_svg+"-labels")            
            .data(parametros[categoria].subtotais)
            .enter()
            .append("text")
            .classed(classe_svg+"-labels", true)
            .attr("x", d => x_scale(d.subtotal) + 5)
            .attr("y", d => y_scale(d.categoria) + dimensoes[classe_svg].altura_barras/2)
            .text(d => valor_formatado(d.subtotal))
            .attr("opacity", 0)
            .transition()
            .delay(duracao*4)
            .duration(duracao)
            .attr("opacity", 1); 

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
          .duration(duracao*2)
          .attr("x", d => dimensoes["principal"].x_scale(+d["pos_ini_"+categoria]))
          .attr("y", d => y_scale(d[categoria]))
          //.attr("height", y.bandwidth() * 0.75)
          .transition()
          .delay(duracao*2)
          .duration(duracao*1.5)
          .attr("fill", cor_padrao)

        desenha_subtotais("principal", categoria);
       
    }

    let for_the_first_time_in_forever = true;
    let parametros_timeline = {};

    function inicializa_timeline() {
        let dados_linha = group_by_sum(dados, "data_mes", "valor", false);

        dados_linha.forEach((d,i) => {
            dados_linha[i]["data"] = d3.timeParse("%Y-%m-%d")(d.categoria);
        });

        const valor_linha_max = d3.max(dados_linha, d => +d.subtotal);

        let y_scale = d3.scaleLinear().domain([0, valor_linha_max]);
        let x_scale = d3.scaleTime().domain(d3.extent(dados_linha, d => d.data));

        $linha = d3.select("svg.vis-timeline")
          .append("path")
          .attr("fill", "none")
          .attr("stroke-width", "2px")
          .attr("stroke", "var(--cor-clara)");   
          
        $eixo_x = d3.select("svg.vis-timeline")
          .append("g") 
          .classed("axis", true)
          .classed("x-axis-timeline", true);

        $eixo_y = d3.select("svg.vis-timeline")
          .append("g") 
          .classed("axis", true)
          .classed("y-axis-timeline", true);

        //console.log("2. Função chamada, definiu o domain (sem atualizar a variável)", y_scale, y_scale.domain());

        return([y_scale, x_scale, $linha, $eixo_x, $eixo_y, dados_linha]);
    }

    function desenha_timeline() {

        //console.log("1. Só defini com d3.scaleLinear()", y_scale)

        if (for_the_first_time_in_forever) {
            [y_scale, x_scale, $linha, $eixo_x, $eixo_y, dados_linha] = inicializa_timeline();
            for_the_first_time_in_forever = false;
        }

        //console.log("3. Agora tô fora, enxergo o y_scale atualizado?", y_scale, y_scale.domain());

        y_scale.range([dimensoes["timeline"].h_numerico - margens["timeline"].bottom, margens["timeline"].bottom]);

        //console.log("4. Agora defini o range, enxergo o y_scale atualizado?", y_scale, y_scale.domain(), y_scale.range());

        x_scale.range([margens["timeline"].left, dimensoes["timeline"].w_numerico - margens["timeline"].right]);
            
        const gerador_linha = d3.line()
            .x(d => x_scale(d.data))
            .y(d => y_scale(d.subtotal))
            .curve(d3.curveCatmullRom.alpha(0.5));

        $linha
            .attr("d", gerador_linha(dados_linha));

        let eixo_x = d3.axisBottom()
            .scale(x_scale);

        if (dimensoes["timeline"].w_numerico < 6000)
            eixo_x = eixo_x.tickFormat(d => formataData_Anos(d))
                           .ticks(d3.timeYear.every(1));
        else
            eixo_x = eixo_x.tickFormat(d => formataData(d))
                           .ticks(d3.timeMonth.every(4));

        $eixo_x
            .attr("transform", "translate(0," + (dimensoes["timeline"].h_numerico - margens["timeline"].bottom) + ")")
            .call(eixo_x);

        let eixo_y = d3.axisLeft()
            .scale(y_scale)
            .tickFormat(d => formataBR(d/1e6))
            .ticks(3);

        $eixo_y
            .attr("transform", "translate(" + margens["timeline"].left + ",0)")
            .call(eixo_y);

        parametros_timeline["x_scale"] = x_scale;
        parametros_timeline["y_scale"] = y_scale;
          

        if (d3.select("svg.vis-timeline").select(".timeline-titulo-eixoY").nodes().length != 0) {
            d3.select("svg.vis-timeline").select(".timeline-titulo-eixoY").remove();
        }
      
        d3.select("svg.vis-timeline")
            .select(".y-axis-timeline .tick:last-of-type text").clone()
            .attr("x", 5)
            .attr("text-anchor", "start")
            .style("font-weight", "bold")
            .classed("timeline-titulo-eixoY", true)
            .text("Valores mensais (R$ mi)");
    }

    ///////////////////////
    // destaques

    function desenha_destaque_timeline(dados_filtrados) {

        let dados_linha = group_by_sum(dados_filtrados, "data_mes", "valor", false);
        dados_linha.forEach((d,i) => {
            dados_linha[i]["data"] = d3.timeParse("%Y-%m-%d")(d.categoria);
        });

        let x_scale = parametros_timeline["x_scale"];
        let y_scale = parametros_timeline["y_scale"];

        const gerador_area_destaque = d3.area()
            .x(d => x_scale(d.data))
            .y0(d => y_scale(0))
            .y1(d => y_scale(d.subtotal))
            .curve(d3.curveCatmullRom.alpha(0.5));

        //console.log(gerador_area_destaque(dados_linha))

        let area_destaque = d3.select("svg.vis-timeline")
                              .select("path.timeline-destaque");
        
        if (area_destaque.nodes().length == 0) {
            area_destaque = d3.select("svg.vis-timeline").append("path")
        };

        area_destaque
          .datum(dados_linha)
          .classed("timeline-destaque", true)
          .attr("d", gerador_area_destaque);



        // let linha_destaque = d3.select("svg.vis-timeline")
        //   .select("path.timeline-destaque")
        //   .datum(dados_linha);

        // let linha_destaque_enter = linha_destaque
        //   .enter()
        //   .append("path");

        // linha_destaque = linha_destaque.merge(linha_destaque_enter)

        // linha_destaque
        //   .classed("timeline-destaque", true)
        // //   .transition()
        // //   .duration(duracao)
        //   .attr("d", gerador_area_destaque);

    }

    function desenha_destaques(valor_destacado) {

        const variavel_principal = ultimo_estado;
        const variavel_aux1 = estado[ultimo_estado].auxiliar1;
        const variavel_aux2 = estado[ultimo_estado].auxiliar2;

        //console.log(variavel_principal, variavel_aux1, variavel_aux2);

        const dados_filtrados = dados
            .filter(d => d[variavel_principal] == valor_destacado);

        const dados_aux1 = group_by_sum(dados_filtrados, variavel_aux1, "valor", variavel_aux1 != "ano");

        const dados_aux2 = group_by_sum(dados_filtrados, variavel_aux2, "valor", variavel_aux2 != "ano");

        //console.log("Dados para o destaque", dados_filtrados, dados_aux1, dados_aux2);

        for (let i of [1,2]) {
            const classe_svg = "auxiliar" + i;
            const categoria = [variavel_aux1, variavel_aux2][i-1];
            const dados_destaque = [dados_aux1, dados_aux2][i-1];

            //console.log("dados destaque", categoria);
            
            const y_scale = dimensoes[classe_svg].y_scale
                .range(obtem_range_y(classe_svg, categoria))
                .domain(parametros[categoria].dominios);

            const x_scale = dimensoes[classe_svg].x_scale;
            const w_scale = dimensoes[classe_svg].w_scale;

            let barras_destaque = d3.select("svg.vis-" + classe_svg)
                .selectAll("rect." + classe_svg + ".destaques")
                .data(dados_destaque, d => d.categoria);

            barras_destaque
                .exit()
                .transition()
                .duration(duracao)
                .attr("width", 0)
                .remove(); // talvez nem precisasse remover

            // coisas que não mudam, independente de ser uma barra nova ou não

            let barras_destaque_enter = barras_destaque
                .enter()
                .append("rect")
                .classed(classe_svg, true)
                .classed("destaques", true)
                .attr("x", d => x_scale(0))
                .attr("y", d => y_scale(d.categoria))
                .attr("height", 0.75 * dimensoes[classe_svg].altura_barras)
                //.attr("width", 0)
                .attr("stroke-width", 0)
                .attr("opacity", 1);

            barras_destaque = barras_destaque.merge(barras_destaque_enter);

            // o que muda numa transição

            barras_destaque
                .transition()
                .duration(duracao)
                .attr("width", d => w_scale(d.subtotal) + 1);

            // oculta labels anteriores

            d3.select("svg.vis-" + classe_svg).selectAll("text." + classe_svg + "-labels")
               .transition()
               .duration(duracao)
               .attr("opacity", 0);

            // acrescenta labels dos percentuais

            let labels_destaque = d3.select("svg.vis-" + classe_svg)
                .selectAll("text." + classe_svg + "-labels-destaques")
                .data(dados_destaque, d => d.categoria);  
                
            labels_destaque
                .exit()
                .text("0 %")

            let labes_destaque_enter = labels_destaque
                .enter()
                .append("text")
                .classed(classe_svg+"-labels-destaques", true)
                .attr("y", d => y_scale(d.categoria) + dimensoes[classe_svg].altura_barras/2)
                .attr("opacity", 0)
                .transition()
                .duration(duracao)
                .attr("opacity", 1);  
                
            labels_destaque = labels_destaque.merge(labes_destaque_enter);
           
            labels_destaque
                .text(function(d) {

                    const valor_destaque = d.subtotal;

                    //console.log("dentro do cálculo do label de destaque", parametros[categoria].subtotais, parametros[categoria].subtotais.filter(e => e.categoria == d.categoria)[0].categoria, d.categoria);

                    let valor_barra_total = parametros[categoria].subtotais.filter(e => e.categoria == d.categoria)[0].subtotal;

                    let valor_percentual = !valor_barra_total ? 0 : 100* valor_destaque/valor_barra_total;

                    return(formataBR_1(valor_percentual) + "%");             
                })
                .attr("x", d => x_scale(parametros[categoria].subtotais.filter(e => e.categoria == d.categoria)[0].subtotal) + 5);           
        }
        desenha_destaque_timeline(dados_filtrados);
    }  
    
    function remove_labels_destaque() {
        for (let i of [1,2]) {
            const classe_svg = "auxiliar" + i;
            d3.select("svg.vis-" + classe_svg)
                .selectAll("text." + classe_svg + "-labels-destaques")
                .remove();
        }
    }

    function destaca_selecao(opcao) {

        categoria_selecionada = d3.select(opcao).data()[0].categoria;
        //console.log(categoria_selecionada);

        let posicao_selecionada;

        d3.select("svg.vis-principal").selectAll("rect.principal")
            .classed("nao-destacado", function(d,i) {
                if (d.categoria == categoria_selecionada) posicao_selecionada = i;
                return (d.categoria != categoria_selecionada);
            });

        //console.log(posicao_selecionada);

        d3.select("svg.vis-principal").selectAll("text.principal-labels")
            .classed("label-destacado", d => d.categoria == categoria_selecionada);

        d3.select("svg.vis-principal").selectAll("g.axis text")
            .attr("fill", d => d == categoria_selecionada ? "var(--cor-escura)" : "currentColor")
            .style("font-weight", d => d == categoria_selecionada ? "bold" : "normal");

        desenha_destaques(categoria_selecionada);            
    }



    ////////////////////////
    // listener das barras, para o destaque

    function listener_barras() {
        d3.select("svg.vis-principal").selectAll("rect.principal").on("click", function() {
            //console.log("ui")
            const selecao = this;
            destaca_selecao(selecao);
        });
    }

    ////////////////////////
    // a funcao que vai chamar todo mundo

    function desenha_estado_atual(opcao) {
        remove_labels_destaque();
        desenha_principal(opcao);
        desenha_subtotais("auxiliar1", estado[opcao].auxiliar1);
        desenha_subtotais("auxiliar2", estado[opcao].auxiliar2);
        desenha_timeline();
        listener_barras();
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

});