# Painel de Honras de Garantias da União

Este painel é, de certa forma, um complemento à visualização de pagamentos efetuados pelo Tesouro Nacional em decorrência da inadimplência de entes subnacionais em contratos de empréstimos garantidos pela União: https://garantias.tesouro.gov.br/honras/

Neste painel, a ideia é mostrar as informações de forma mais agregada nas principais variáveis/dimensões de interesse: credores, mutuários, exercícios (e meses) e tipo da dívida (interna ou externa). 

No entanto, tentamos integrar a esse objetivo a ideia da visualização de cada pagamento individual feito pelo Tesouro. Para isso, representamos cada pagamento como um pequeno retângulo, de dimensões proporcionais ao valor do pagamento. Conforme a variável categórica selecionada pelo usuário, os retângulos se reorganizam, distribuem-se verticalmente nas respectivas categorias e se empilham para formar as "barras" que correspondem ao valor total pago nas categorias que compõem a variável escolhida. Além disso, é possível alternar para um modo "detalhado", em que cada retângulo se transforma em um círculo de área proporcional ao valor do pagamento. Nesse modo, é possível visualizar uma linha do tempo dos pagamentos por mutuário. Ao passar-se o mouse sobre o círculo, é exibida uma caixa com todas as informações relacionadas àquele pagamento.

Todo o painel foi construído com HTML, CSS, Javascript e [D3.js](https://d3js.org/). Os dados foram preparados com R. Todos os códigos utilizados estão disponíveis aqui neste repositório:

* Os dados originais estão no diretório `/R`, junto com o script de tratamento, preparação e verificação dos dados: `prep.R`. Esse script também foi utilizado para exploração e construção de protótipos iniciais dos gráficos.

* O script em `R` mencionado grava uma versão dos dados num formato adequado para o desenvolvimento do painel propriamente dito. Esses dados se encontram em `/dados/dados.csv`.

* Esses dados serão lidos pelo script `/web/vis.js` para gerar o painel, a partir da página HTML `/index.html`. Os estilos foram definidos por `/web/main.css` e `/web/vis.css`.

* Usamos ainda um script com algumas funções auxiliares escritas por nós, que facilitam o nosso desenvolvimento, `/web/utils.js`. Por fim, decidimos manter a única dependência externa, `d3.js`, copiada em `/web/external_scrips/`, para garantir que a aplicação não "quebre" em eventuais alterações/atualizações no futuro.

## Ideias aleatórias

Neste projeto, tentei encapsular a maior parte do código em funções, para tentar deixar mais claro as ações sendo executadas (muito inspirado numa frase do Marijn Haverbeke: 

> It is more likely to be correct because the solution is expressed in a vocabulary that corresponds to the problem being solved. Summing a range of numbers isn’t about loops and counters. It is about ranges and sums. ("Eloquent Javascript, 3rd edition").

Uma questão que surgiu foi o de como comunicar informações comuns a diversas funções (numa estrutura em que as funções são chamadas como "irmãs", e não uma função chamando outra e passando argumentos para ela). Acabei optando por usar objetos globais, que fossem sendo manipulados pelas funções, onde elas poderiam armazenar e buscar informações, parâmetros necessários para seu funcionamento. É assim que as pessoas trabalham? Não faço ideia.)
