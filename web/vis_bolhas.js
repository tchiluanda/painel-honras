function configura_simulacao() {

}

function desenha_detalhado() {
    d3.select(":root")
      .transition()
      .duration(duracao)
      .style("--cor-escura", "#ffde59")
      .style("--cor-fundo", "#832561");
}