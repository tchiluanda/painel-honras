const $ultima_data = d3.select("span.js--ultima-data");
const $qde_honras  = d3.select("strong.js--qde-honras");

let font_size = +d3.select(":root").style("font-size").slice(0,-2);
const largura_mobile = 580;
let mobile = window.innerWidth <= largura_mobile;

///////////////////////////////////////////////////
// define tamanho do container do grid

// objetos importantes:
// * parametros : para cada variável, vai informar domínios, subtotais, quantidades, máximos.
// * margens
// * dimensões: para cada svg, vai informar altura, largura, inicializa escalas etc.

function dimensiona_container(opcao) {
    let altura_logo = d3.select("header.logo").node().offsetHeight;
    //let altura_header = d3.select("main>header").node().offsetHeight;
    let altura_nav = d3.select("div.grupo-controles").node().offsetHeight;
    let altura_janela = window.innerHeight;

    let altura_container_vis = altura_janela - altura_logo - altura_nav - 20; //- altura_header 
    // atenção! a margen não entra nesse cálculo, então é importante zerar as margens verticais entre os elementos sendo medidos.
    //console.log(altura_container_vis);

    //console.log(altura_janela, altura_logo, altura_nav, altura_container_vis)

    if (opcao == "agregado") {
        altura_container_vis = window.innerWidth < 1080 ? 950 : altura_container_vis;
        // se é menor que 1080, quer dizer que está no modo mobile do grid.
        // considerando o mínimo normal de 530, isso dá 424 para o painel principal, 212 para os auxiliares e 106 para a timeline.
        // então no modo mobile, considerando o empilhamento diferente do grid, precisaria de 424+212+212+106 = 954
    
        altura_container_vis = altura_container_vis < 530 ? 530 : altura_container_vis;
    
    } // ou seja,se estiver no modo detalhado, usar altura do viewport

    console.log(opcao, altura_container_vis);

    mobile = window.innerWidth <= largura_mobile;
    font_size = mobile ? 9.6 : 12.8;
    
    d3.select(".vis-container").style("height", altura_container_vis + "px");
}

dimensiona_container("agregado");

// agora temos as dimensoes necessarias para cada svg nesse objeto `dimensoes`


d3.csv("dados/dados.csv").then(function(dados) {
    console.log(dados.columns);
    // ["", "data", "tipo_divida", "Credor_completo", "contrato", "tipo_credor", "mutuario", "tipo_mutuario", "Status", "valor", "mes", "ano", "mes_ano", "data_mes", "Credor", "nome_projeto", "top_mutuario", "pos_ini_mutuario", "pos_ini_Credor", "pos_ini_tipo_divida", "pos_ini_ano"]
    //console.log(dados[0]);

    //localStorage.setItem('dados', JSON.stringify(dados.map(d => ({"data": d.data, "mutuario": d.mutuario, "valor": +d.valor}))));

    let top_mutuarios = group_by_sum(dados, "top_mutuario", "valor", true).map(d => d.categoria);
    console.log(top_mutuarios);


    dados.forEach((d,i) => {dados[i].data = d3.timeParse("%Y-%m-%d")(d.data);
                            dados[i]["data_br"] = d3.timeFormat("%d de %B de %Y")(dados[i].data);});

    console.log(dados[0]);

    const TOTAL = d3.sum(dados, d => d.valor);
    
    const DATA_ATUALIZACAO = d3.timeFormat("%B de %Y")(d3.max(dados, d => d.data));

    console.log(TOTAL, DATA_ATUALIZACAO);

    const VALOR_MAX_MENSAL = d3.max(group_by_sum(dados, "mes_ano", "valor"), d => d.subtotal);

    console.log(VALOR_MAX_MENSAL);
    
  

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

    let simulacao;
    let simulacao_parametros = {};

    const max_honra = d3.max(dados, d => +d.valor);
    const max_valor = d3.max(parametros._maximos);
    const max_quantidade = d3.max(parametros._quantidades);
    const duracao = 700;
    const cor_padrao = d3.select(":root").style("--cor-escura");
    const cor_escura_sim = d3.select(":root").style("--cor-escura-sim");
    const cor_fundo_sim = d3.select(":root").style("--cor-fundo-sim");
    const cor_clara_sim = d3.select(":root").style("--cor-clara-sim");
    const cor_destaque = "coral";

    ///////////////////////////////////////////////////
    // referencias, margens e dimensões dos svgs

    const svg_prin = d3.select("svg.vis-principal");
    const svg_aux1 = d3.select("svg.vis-auxiliar1");
    const svg_aux2 = d3.select("svg.vis-auxiliar2");

    const classes = ["principal", "auxiliar1", "auxiliar2"];

    const margens = {
        principal : {
            top : 10,
            right : 50,
            bottom: 10,
            left: 140,
            left_mobile: 10,
            right_mobile: 10
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
    
    console.log(dimensoes);   

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

            //remove barras de destaque
            d3.select("svg.vis-" + classe_svg)
                .selectAll("rect." + classe_svg + ".destaques")
                .transition()
                .duration(duracao)
                .attr("width", 0)
                .remove();
        }

        const x_scale = dimensoes[classe_svg].x_scale;
        const w_scale = dimensoes[classe_svg].w_scale;
        
        // remove as barras de subtotais preexistentes

        let barras_subtotais = d3.select("svg.vis-" + classe_svg)
            .selectAll("rect." + classe_svg + ".subtotais")
            .data(dados, d => d.categoria);

        barras_subtotais
            .exit()
            .remove();
    
        // inclui as barras de subtotais por cima
        // as lógicas tratam quando as barras de subtotais estão nos paineis auxiliares. nesses casos, não caro que apareçam, mas que cresçam (como efeito de entrada)

        let barras_subtotais_enter = barras_subtotais
            .enter()
            .append("rect")
            .classed(classe_svg, true)
            .classed("subtotais", true); // fill e stroke definido em classes

        barras_subtotais = barras_subtotais.merge(barras_subtotais_enter)

        barras_subtotais
            .attr("x", d => x_scale(0))
            .attr("y", d => y_scale(d.categoria))
            .attr("height", 0.75 * dimensoes[classe_svg].altura_barras)
            .attr("width", d => classe_svg != "principal" ? 0 : w_scale(d.subtotal) + 1)
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

    function complementa_ano() {
        const altura_necessaria_barras = dimensoes['principal'].altura_barras * parametros['ano'].quantidade;
        const posicao_top = margens['principal'].top + altura_necessaria_barras + 20;

        if (d3.select("text.d3-total-acumulado").nodes().length == 0) {
            d3.select("svg.vis-principal")
                .append("text")
                .classed("d3-total-acumulado", true)
                .attr("opacity", 0)
        }

        d3.select("svg.vis-principal").select("text.d3-total-acumulado")
            .attr("x", mobile ? margens['principal'].left_mobile : margens['principal'].left)
            .attr("y", posicao_top)
            .text("Valor total honrado: R$ " + valor_formatado(TOTAL) + ", até " + DATA_ATUALIZACAO)
            .style("font-size", font_size + "px")
            .append("tspan")
            .attr("x", mobile ? margens['principal'].left_mobile : margens['principal'].left)
            .attr("y", posicao_top + font_size * 1.5)
            .text("Clique na barra de um exercício para visualizar os valores mensais");

        d3.select("text.d3-total-acumulado")
          .transition()
          .delay(duracao*3)
          .duration(duracao)
          .attr("opacity", 1)

        dimensoes["principal"]["pos_inicial_meses"] = posicao_top + font_size * 2.5 + 20;

        console.log(dimensoes)
    }

    function desenha_principal(categoria) {

        // ajusta escalas

        color.domain(parametros[categoria].dominios)

        const y_scale = d3.scaleBand()
          .range(obtem_range_y("principal", categoria))
          .domain(parametros[categoria].dominios);
        
        // // para as bolhas
        const escala_raio = d3.scaleSqrt()
          .range([2, 10])  // 45
          .domain([0, max_honra]);

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
          .transition()
          .duration(duracao)       
          .attr("fill", d => color(d[categoria]))
          .transition()
          .delay(ultima_selecao == "detalhado" ? 0 : duracao)
          .duration(duracao*2)
          .attr("height", 0.75 * dimensoes["principal"].altura_barras)
          .attr("width", function(d,i) {
              let largura = dimensoes["principal"].w_scale(+d.valor) + 1;
              //let area = largura * 0.75 * dimensoes["principal"].altura_barras; //(1)
              dados[i]["raio"] = escala_raio(+d.valor);
              return largura;
            })            
          .attr("rx", 0) // para a volta da simulação
          .attr("x", d => dimensoes["principal"].x_scale(+d["pos_ini_"+categoria]))
          .attr("y", d => y_scale(d[categoria]))
          //.attr("height", y.bandwidth() * 0.75)
          .transition()
          .delay(duracao*2)
          .duration(duracao*1.5)
          .attr("fill", cor_padrao);

          //(1) armazeno uma propriedade "lado" em dados para usar na simulacao

        desenha_subtotais("principal", categoria);

        if (categoria == 'ano') complementa_ano()
        else d3.select("text.d3-total-acumulado")
            .transition()
            .duration(duracao)
            .attr("opacity", 0)
       
    }

    function desenha_meses(ano_selecionado, dados_filtrados) {
        console.log("hmm, ok, vamos desenhar o ano " + ano_selecionado);

        console.log(dimensoes['principal'].pos_inicial_meses);

        let dados_ano = group_by_sum(dados_filtrados, "data_mes", "valor");

        // esse objeto localeDataBrasil está definido em "utils.js"
        dados_ano.forEach((d,i) => {
            dados_ano[i]['mes'] = localeDataBrasil.shortMonths[+d.categoria.slice(5,7)-1];
        });

        console.log(dados_ano);

        let margem_esquerda = mobile ? margens['principal'].left_mobile : margens['principal'].left - 40;
        let margem_direita = mobile ? margens['principal'].right_mobile : margens['principal'].right - 30;

        let pad_vertical = mobile ? 20 : 50;
        

        let x_meses = d3.scaleBand()
          .range([
              margem_esquerda + mobile ? 50 : 60,
              dimensoes['principal'].w_numerico - margem_direita
            ])
          .domain(localeDataBrasil.shortMonths);

        console.log(x_meses.range(), x_meses.domain());

        let y_meses = d3.scaleLinear()
          .range([
              dimensoes['principal'].h_numerico - margens['principal'].bottom - pad_vertical,
              dimensoes['principal'].pos_inicial_meses + pad_vertical,
          ])
          .domain([0, VALOR_MAX_MENSAL]);

        let h_meses = d3.scaleLinear()
          .range([
              0, 
              dimensoes['principal'].h_numerico - margens['principal'].bottom - pad_vertical - dimensoes['principal'].pos_inicial_meses - pad_vertical])
          .domain(y_meses.domain());

        if (!d3.select("rect.background-meses").node()) {
            d3.select("svg.vis-principal").append("rect")
            .classed("background-meses", true)
            .attr("x", margem_esquerda)
            .attr("y", dimensoes['principal'].pos_inicial_meses)
            .attr('width', dimensoes['principal'].w_numerico - margem_direita - margem_esquerda)
            .attr('height', dimensoes['principal'].h_numerico - margens['principal'].bottom - dimensoes['principal']["pos_inicial_meses"])
            .attr("fill", "#efefef");
        }

        let $rect_meses = d3.select("svg.vis-principal").selectAll("rect.valores-meses").data(dados_ano, d => d.mes);

        $rect_meses.exit()
          .transition()
          .duration(duracao)
          .attr("height", 0)
          .attr("y", y_meses(0))
          .remove();

        let $rect_meses_enter = $rect_meses.enter()
          .append("rect")
          .classed("valores-meses", true)
          .attr("y", y_meses(0))
          .attr("height", 0);

        $rect_meses = $rect_meses.merge($rect_meses_enter)

        $rect_meses
          .attr("x", d => x_meses(d.mes))
          .attr("width", x_meses.bandwidth()*0.5)
          .transition()
          .duration(duracao)
          .attr("height", d => h_meses(d.subtotal))
          .attr("y", d => y_meses(d.subtotal));
      
        if (!d3.select("g.x-axis-meses").node()) {
            console.log("Criar eixo...");

            let eixo_x_meses = d3.axisBottom()
                .scale(x_meses);

            d3.select("svg.vis-principal")
                .append("g") 
                .attr("transform", "translate(-" + 
                x_meses.bandwidth()*0.5/2 + "," + 
                (dimensoes['principal'].h_numerico - margens['principal'].bottom - pad_vertical) + ")")
                .classed("axis", true)
                .classed("x-axis-meses", true)
                .call(eixo_x_meses); 
                
            let eixo_y_mes = d3.axisLeft()
              .scale(y_meses)
              .tickFormat(d => formataBR(d/1e6))
              .ticks(mobile ? 5 : 10);

            d3.select("svg.vis-principal")
                .append("g")
                .attr("transform", "translate(" + (x_meses.range()[0] - x_meses.bandwidth()*0.5/2) + ",0)")
                .classed("axis", true)
                .classed("axis-y-meses", true)
                .call(eixo_y_mes);

            d3.select(("svg.vis-principal"))
                .select(".axis-y-meses .tick:last-of-type text").clone()
                  .attr("x", 5)
                  .attr("text-anchor", "start")
                  .style("font-weight", "bold")
                  .text("Valores mensais (R$ mi)");
        }


    }

    function desenha_destaques(valor_destacado) {

        const variavel_principal = ultimo_estado;
        const variavel_aux1 = estado[ultimo_estado].auxiliar1;
        const variavel_aux2 = estado[ultimo_estado].auxiliar2;

        const dados_filtrados = dados
            .filter(d => d[variavel_principal] == valor_destacado);

        // desenha gráfico dos meses
        if (variavel_principal == "ano") desenha_meses(valor_destacado, dados_filtrados);

        const total_valor_destacado = d3.sum(dados_filtrados, d => d.valor);
        console.log(total_valor_destacado);

        const dados_aux1 = group_by_sum(dados_filtrados, variavel_aux1, "valor", variavel_aux1 != "ano");

        const dados_aux2 = group_by_sum(dados_filtrados, variavel_aux2, "valor", variavel_aux2 != "ano");

        //console.log("Dados para o destaque", dados_filtrados, dados_aux1, dados_aux2);

        for (let i of [1,2]) {
            const classe_svg = "auxiliar" + i;
            const categoria = [variavel_aux1, variavel_aux2][i-1];
            let dados_destaque = [dados_aux1, dados_aux2][i-1];

            dados_destaque.forEach((d,i) => {
                dados_destaque[i]["percentual"] = d.subtotal / total_valor_destacado;
            });

            console.log("dados destaque", categoria, dados_destaque);
            
            const y_scale = dimensoes[classe_svg].y_scale
                .range(obtem_range_y(classe_svg, categoria))
                .domain(parametros[categoria].dominios);

            const x_scale = dimensoes[classe_svg].x_scale;
            const w_scale_local = d3.scaleLinear(); // tô criando uma nova, para evitar o problema que estava acontecendo de eu achar que estava criando uma cópia local, mas quando eu alterava o domínio da função escala supostamente local, ele alterava o domínio da função escala que está láaa no objeto de referência
            
            w_scale_local.range(dimensoes[classe_svg].w_scale.range()); // pego o range da função lá do meu objeto

            w_scale_local.domain([0,1]); // já que agora é percentual

            console.log(dimensoes[classe_svg].w_scale.domain());

            //remove barras de subtotais

            d3.select("svg.vis-" + classe_svg)
              .selectAll("rect." + classe_svg + ".subtotais")
              .transition()
              .duration(duracao)
              .attr("width", 0)
              .remove();

            //acrescentas as de destaque

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
                .attr("width", d => w_scale_local(d.percentual) + 1);

            // oculta labels anteriores

            d3.select("svg.vis-" + classe_svg).selectAll("text." + classe_svg + "-labels")
               .transition()
               .duration(duracao)
               .attr("opacity", 0);

            // acrescenta labels dos percentuais

            let labels_destaque = d3.select("svg.vis-" + classe_svg)
                .selectAll("text." + classe_svg + "-labels-destaques")
                .data(dados_destaque, d => d.subtotal);  
                
            labels_destaque
                .exit()
                .text("")

            let labels_destaque_enter = labels_destaque
                .enter()
                .append("text")
                .classed(classe_svg+"-labels-destaques", true)
                .attr("y", d => y_scale(d.categoria) + dimensoes[classe_svg].altura_barras/2)
                .attr("opacity", 0)
                .transition()
                .duration(duracao)
                .attr("opacity", 1);  
                
            labels_destaque = labels_destaque.merge(labels_destaque_enter);
           
            labels_destaque
                .text(d => d3.format(".001%")(d.percentual))
                .attr("x", d => x_scale(0) + w_scale_local(d.percentual) + 5);           
        }
    }  
    
    function remove_labels() {
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

    function remove_para_modo_detalhado() {
        d3.selectAll("svg.vis-auxiliar1, svg.vis-auxiliar2").selectAll("*").remove();
        d3.select("svg.vis-principal").selectAll(".axis, .principal-labels, .subtotais, text.d3-total-acumulado").remove();
    }

    function redimensiona_svgs(opcao) {
        d3.select("div.vis-container").classed("modo-detalhado", 
        opcao == "detalhado");
        d3.selectAll("svg.vis-auxiliar1, svg.vis-auxiliar2").classed("modo-detalhado", 
        opcao == "detalhado");
        dimensiona_container(opcao);
        dimensoes["principal"] = pega_dimensoes("principal");
    }

    function volta_para_agregado() {
        d3.select(":root")
        .transition()
        .duration(duracao)
        .style("--cor-escura", null)
        .style("--cor-cinza-escura", null)
        .style("--cor-cinza-clara", null)
        .style("--cor-fonte", null)
        .style("--cor-fundo", null);

        simulacao.stop();

        d3.select("svg.vis-principal").selectAll("g.axis-detalhado").remove();

        rects_honras
         .attr("stroke-width", null)
         .attr("stroke", null);
    }

    function armazena_posicoes_atuais() {
        rects_honras.each(function(d,i,nodes) {
            dados[i]["x"] = +d3.select(this).attr("x");
            dados[i]["y"] = +d3.select(this).attr("y");
        });
        rects_honras.attr("fill", "dodgerblue")
        console.log("Primeiro y", dados[0].y, d3.select("svg.vis-principal").style("width"));
    }

    function vai_para_detalhado(opcao) {
        armazena_posicoes_atuais()
        redimensiona_svgs(opcao)
        remove_para_modo_detalhado();
        desenha_detalhado();
    }

    function alterna_barra_nav(opcao) {
        let agregado = opcao == "agregado";
        d3.select("nav.js--controle-categoria-detalhado").classed("escondido", agregado);
        d3.select("nav.js--controle-categoria").classed("escondido", !agregado);
    }

    ////////////////////////////////////////////////////////////////////////
    // BOLHAS
   
    function desenha_detalhado() {  
          
        d3.select(":root")
            .transition()
            .duration(duracao)
            .style("--cor-escura", cor_escura_sim)
            .style("--cor-fonte", cor_escura_sim)
            .style("--cor-cinza-escura", cor_escura_sim)
            .style("--cor-cinza-clara", cor_clara_sim)
            .style("--cor-fundo", cor_fundo_sim);

        configura_simulacao("mutuario");
        simulacao.alpha(1).restart();

        rects_honras
            .transition()
            .duration(duracao)
            .attr("rx", d => 2*d.raio)
            .attr("width", d => 2*d.raio)
            .attr("height", d => 2*d.raio)
            .attr("fill", "var(--cor-escura")
            .attr("stroke", d3.rgb(cor_escura_sim).darker())
            .attr("stroke-width", 1);

        //listener das opções no modo detalhado

        const $botoes_detalhado = d3.selectAll("nav.js--controle-categoria-detalhado > button");

        // deixa a opção total selecionada por padrão
        $botoes_detalhado.classed("selected", false);
        d3.select("#det-total").classed("selected", true);

        // listener dos botões do detalhado
        $botoes_detalhado.on("click", function(){
        
            const opcao = this.id;
            $botoes_detalhado.classed("selected", false);
            d3.select(this).classed("selected", true);
            move_bolhas_detalhado(opcao, "mutuario");
        });

        // listener dos tooltips
        rects_honras
          .on('mouseover', mostraTooltip)
          .on('mouseout',  escondeTooltip);
    };

    function configura_simulacao(categoria) {

        const magnitudeForca = 0.04;
        const carga = function(d) {
            return -Math.pow(d.raio, 2.0) * magnitudeForca;
        }

        // para a visão de timeline:

        let pos_y = d3.scaleBand()
            .range([80, dimensoes["principal"].h_numerico - 40])
            .domain(top_mutuarios);

        let pos_x = d3.scaleTime()
            .range([110, dimensoes["principal"].w_numerico - 20])
            .domain([new Date("2016-01-01"), d3.max(dados, d => d.data)]);

        console.log("Configura force", dimensoes["principal"].h_numerico, dimensoes["principal"].w_numerico, pos_x.range(), pos_x.domain(),pos_x(new Date("2016-04-16")));

        simulacao_parametros["magnitude"] = magnitudeForca;
        simulacao_parametros["pos_x"] = pos_x;
        simulacao_parametros["pos_y"] = pos_y;
        simulacao_parametros["carga"] = carga;

        // melhoria: será que valeria a pena por o listener dos botões aqui dentro, e aí as funções de desenho "total" e "timeline" seriam chamadas daqui de dentro, e poderiam aproveitar as variáveis declaradas neste escopo?

        let inicial;
        
        const atualiza_tick = function() {
            rects_honras
            .attr("x", d => d.x - d.raio) // -d.raio pq são retângulos
            .attr("y", d => d.y - d.raio);
        };
        
        simulacao = d3.forceSimulation()
            .velocityDecay(0.2)
            .force('x', d3.forceX().strength(magnitudeForca).x(dimensoes["principal"].w_numerico/2))
            .force('y', d3.forceY().strength(magnitudeForca).y(dimensoes["principal"].h_numerico/3))
            .force('charge', d3.forceManyBody().strength(carga))
            .force('colisao', d3.forceCollide().radius(d => d.raio))
            .on('tick', atualiza_tick);
        
        simulacao.stop()
        simulacao.nodes(dados);
    };    

    function move_bolhas_detalhado(opcao, categoria) {

        let magnitudeForca = simulacao_parametros["magnitude"];
        let carga = simulacao_parametros["carga"];
        let pos_x = simulacao_parametros["pos_x"];
        let pos_y = simulacao_parametros["pos_y"];

        if (opcao == "det-timeline") {
            simulacao
                .force('x', d3.forceX().strength(magnitudeForca).x(d => pos_x(d.data)))
                .force('charge', null)
                .force('colisao', d3.forceCollide().radius(d => d.raio))
                .force('y', d3.forceY().strength(magnitudeForca).y(d => pos_y(d.top_mutuario) - d.raio))
                

            let eixo_detalhado = d3.axisLeft().scale(pos_y);
            d3.select("svg.vis-principal")
              .append("g")
              .classed("axis", true)
              .classed("y-axis", true)
              .classed("axis-detalhado", true)
              .attr("transform", "translate(" + 120 + ",-23)")
              .call(eixo_detalhado);

            let eixo_detalhado_top = d3.axisTop().scale(pos_x);

            if (dimensoes["principal"].w_numerico < 600) {
                eixo_detalhado_top = eixo_detalhado_top
                    .tickFormat(d => formataData_Anos(d))
                    .ticks(d3.timeYear.every(1));
            }

            else {
                eixo_detalhado_top = eixo_detalhado_top
                    .tickFormat(d => formataData(d))
                    .ticks(d3.timeMonth.every(4));
            }


            d3.select("svg.vis-principal")
                .append("g")
                .classed("axis", true)
                .classed("x-axis", true)
                .classed("axis-detalhado", true)
                .attr("transform", "translate(0,40)")
                .call(eixo_detalhado_top);                         

        }

        else if (opcao == "det-total") {
            simulacao
                .force('x', d3.forceX().strength(magnitudeForca).x(dimensoes["principal"].w_numerico/2))
                .force('y', d3.forceY().strength(magnitudeForca).y(dimensoes["principal"].h_numerico/3))
                .force('colisao', null)
                .force('charge', d3.forceManyBody().strength(carga));
            
            d3.select("svg.vis-principal").selectAll("g.axis-detalhado").remove();

        };

        // se não dá esse restart, as bolhas não se movem
        // com "vontade"

        simulacao.alpha(1).restart();
    };

    function mostraTooltip(d) {
        let x_tooltip = +d3.select(this).attr('x');
        let y_tooltip = +d3.select(this).attr('y');
    
        const $tooltip = d3.select("#tooltip");
        
        let largura_tooltip_css = +$tooltip.style("width").substring(0, $tooltip.style("width").length-2);
        
        $tooltip.classed("hidden", false);
    
        // popula informacao
  
        const infos_tooltip = ["mutuario", "Credor", "tipo_divida", "data_br", "nome_projeto", "valor"];
    
        infos_tooltip.forEach(function(info) {
            let text = "";
            if (info == "valor") text = valor_formatado(d[info])
            else text = d[info];
            $tooltip.select("#tt-"+info).text(text);
        })
    
        // now that the content is populated, we can capture the tooltip
        // height, so that we can optime the tt position.
    
        const altura_tooltip = $tooltip.node().getBoundingClientRect().height;
        //console.log(tooltip_height);
    
        // calculate positions
    
        const pad = 10;

        //console.log(x_tooltip, largura_tooltip_css, pad, dimensoes["principal"].w_numerico);
    
        if (x_tooltip + largura_tooltip_css + pad > dimensoes["principal"].w_numerico) {
            x_tooltip = x_tooltip - largura_tooltip_css - pad;
        } else {
            x_tooltip = x_tooltip + pad
        }
    
        if (y_tooltip + altura_tooltip + pad > dimensoes["principal"].h_numerico) {
            y_tooltip = y_tooltip - altura_tooltip - pad;
        } else {
            y_tooltip = y_tooltip + pad
        }
    
        $tooltip
          .style('left', x_tooltip + 'px')
          .style('top', y_tooltip + 'px');
    };

    function escondeTooltip(d) {
        d3.select("#tooltip").classed("hidden", true);
    };    




    // fim bolhas 
    //////////////////////////////////////////////////////////////////////////



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
        remove_labels();
        desenha_principal(opcao);
        desenha_subtotais("auxiliar1", estado[opcao].auxiliar1);
        desenha_subtotais("auxiliar2", estado[opcao].auxiliar2);
        listener_barras();
    }    

    //////////////////////
    // para dar início!

    let ultimo_estado = "ano";
    let ultima_selecao = "agregado";

    // fiz essa função para poder amarrar um listener de tamanho da janela;

    let altura_janela_anterior = window.innerHeight;

    function resize_init() {
        if (ultima_selecao == "agregado") { 
            if ((window.innerWidth < 1080) & (window.innerHeight != altura_janela_anterior)) {
            }
            else {
                dimensiona_container(ultima_selecao);
                dimensiona_vis();
                desenha_estado_atual(ultimo_estado);
            }
        } // ignora se estiver no modo detalhado

        altura_janela_anterior = window.innerHeight;
    }

    desenha_estado_atual(ultimo_estado);

    ///////////////////////
    // listener dos botões de categorias

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
    // listener dos botões de agregado /detalhado

    const $botoes_principais = d3.selectAll("nav.js--controle-principal > button");

    $botoes_principais.on("click", function(){
     
      const opcao = this.id;

      $botoes_principais.classed("selected", false);
      d3.select(this).classed("selected", true);

      alterna_barra_nav(opcao);
      
      if (opcao != ultima_selecao) {
        if (opcao == "agregado") {
            redimensiona_svgs(opcao)
            volta_para_agregado();
            for_the_first_time_in_forever = true; // essas duas coisas deveriam estar em funções
            classes.forEach(d => cria_eixos_y(d))
            desenha_estado_atual(ultimo_estado)
            ultima_selecao = opcao;
        }
        else {
            //d3.select("nav.js--controle-categoria").style("opacity", "0");
            ultima_selecao = opcao;
            vai_para_detalhado(opcao);
        };
      };


    });

    



    ///////////////////////
    // listener do resize

    window.addEventListener('resize', debounce(resize_init, 500));

    // d3.select("svg.vis-principal").selectAll("rect.principal").on("click", function(){console.log(d3.select(this).data())})

    // d3.select("svg.vis-principal").selectAll("g.axis text").attr("fill", (d,i) => d == "Goiás" ? "coral" : "blue")
    console.log(dimensoes, parametros);

});