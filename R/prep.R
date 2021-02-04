library(tidyverse)
library(lubridate)
library(stringr)
library(viridis)
library(colorspace)
library(extrafont)
library(padr)
library(gganimate)
library(rlang)

#extrafont::font_import()
loadfonts()



# importa dados -----------------------------------------------------------

honras <- read.csv2("./R/relatorio_honras_2021_01.csv",
                    skip = 10, stringsAsFactors = FALSE,
                    fileEncoding="latin1")

names(honras) <- c("Data de Vencimento", "Tipo de Dívida", "Nome do Contrato", 
                   "Credor", "Classificação do Credor", "Mutuário", "Tipo de Mutuário", 
                   "Processo PGFN", "Status", "Data Limite da União", "Data Regularização do Atraso", 
                   "Moeda de Origem", "Total no Vencimento (Moeda de Origem)", "Honra - Principal (Moeda de Origem)", 
                   "Honra - Juros/Encargos (Moeda de Origem)", "Honra - Mora (Moeda de Origem)", 
                   "Honra - Total (Moeda de Origem)", "Honra - Principal (R$)", 
                   "Honra Juros/Encargos (R$)", "Honra - Mora (R$)", "Honra - Total (R$)", 
                   "Ano Regularização", "Mês Regularização") #, "remover")

info_cadastrais_raw <- read.csv2("./R/info_cadastrais_2020_12.csv",
                             skip = 10, stringsAsFactors = FALSE,
                             fileEncoding="latin1")

info_cadastrais <- info_cadastrais_raw %>%
  select(contrato = "Nome.do.Contrato",
         nome_projeto = Projeto)

# processamento inicial ---------------------------------------------------

# verificar novos credores com dput(sort(unique(honras$Credor)))
# verificar siglas com dput(unique(info_cadastrais_raw$Credor))

credor_siglas <- data.frame(
  Credor = c(
    "Agência Francesa de Desevolvimento", 
    "Banco Bilbao Vizcaya Argentaria", 
    "Banco do Brasil S/A", 
    "Banco do Nordeste",
    "BNP",
    "Banco Mundial", 
    "Banco Nacional de Desenvolvimento Econômico e Social", 
    "Banco Suiço de Investimento - Credit Suisse", 
    "Banco Suiço de Investimento - Credit Suisse-Brasil", 
    "Bank of America", 
    "BID", 
    "Caixa Econômica Federal", 
    "Corporacão Andina de Fomento", 
    "Fundo Financeiro para Desenvolvimento da Bacia do Prata", 
    "Japan International Cooperation Agency", 
    "UniCredit"),
  Credor_sigla = c(
    "AFD",
    "BBVA",
    "BB", 
    "BNB",
    "BNP",
    "BIRD",
    "BNDES",
    "CREDIT SUISSE",
    "CREDIT SUISSE-BRASIL",
    "BOFA",
    "BID",
    "CAIXA",
    "CAF",
    "FONPLATA",
    "JICA",
    "UniCredit"),
  stringsAsFactors = FALSE
)

honras_pre <- honras %>%
  select(data = `Data Regularização do Atraso`,
         tipo_divida = `Tipo de Dívida`,
         `Credor`,
         contrato = `Nome do Contrato`,
         tipo_credor = `Classificação do Credor`,
         mutuario = `Mutuário`,
         tipo_mutuario = `Tipo de Mutuário`,
         `Status`,
         valor = `Honra - Total (R$)`) %>%
  as.data.frame() %>%
  mutate(data = dmy(data),
         mes = str_pad(month(data), width = 2, pad = "0"),
         ano = year(data),
         mes_ano = paste0(ano,mes),
         data_mes = as.Date(paste(str_sub(mes_ano, 1, 4),
                                         str_sub(mes_ano, 5, 6),
                                         "01", sep = "-")),
         valor = as.numeric(
           str_replace(
             str_replace_all(as.character(valor), "\\.", ""), 
             ",", "\\.")),
         mutuario = ifelse(mutuario %in% c("São Paulo", "Rio de Janeiro"),
                           paste0(mutuario, " (", str_sub(tipo_mutuario, end = -2),")"),
                           mutuario)) %>%
  arrange(data) %>%
  left_join(credor_siglas) %>%
  rename(Credor_completo = Credor,
         Credor = Credor_sigla) %>%
  left_join(info_cadastrais)


# top mutuários -----------------------------------------------------------

top_mutuarios <- honras_pre %>% 
  group_by(mutuario) %>% 
  summarise(valor = sum(valor)) %>% 
  arrange(desc(valor)) %>%
  ungroup() %>%
  mutate(top_mutuario = ifelse(rank(-valor)<=11, mutuario, "Demais")) %>%
  select(-valor)

# empilhamento dos valores ------------------------------------------------

# honras_stack <- honras_pre %>%
#   group_by(mutuario) %>%
#   mutate(pos_ini_mutuario = cumsum(valor) - valor)

variaveis_de_interesse <- c("mutuario", "Credor", "tipo_divida", "ano")

honras_stack <- honras_pre %>%
  left_join(top_mutuarios)

for (var in variaveis_de_interesse) {
  quo_var <- sym(var) # transforma "var", que é string, num símbolo
  
  honras_stack <- honras_stack %>%
    group_by(!! quo_var) %>%
    mutate(!! paste0("pos_ini_", var) := cumsum(valor) - valor) %>%
    ungroup()
}

ggplot(honras_stack) + geom_segment(aes(y = mutuario, yend = mutuario,
                                     x = pos_ini_mutuario, xend = pos_ini_mutuario + valor)) +
  theme(legend.position = "none")

## exporta

write.csv(honras_stack, file = "dados/dados.csv", fileEncoding = "UTF-8")

#verificacoes

honras_stack %>% 
  group_by(mutuario) %>% 
  summarise(soma = sum(valor)) %>% 
  arrange(desc(soma))

  sum(honras_stack$valor[honras_stack$mutuario=="Rio de Janeiro (Estado)"]) / sum(honras_stack$valor)
length(unique(honras_stack$mutuario))

honras_stack %>% filter(ano == 2020) %>% group_by(Credor) %>% summarise(sum(valor)) %>% arrange(desc(`sum(valor)`))

View(honras_stack %>% count(data_mes))


# prototipos das viz ------------------------------------------------------

plota_sumario <- function(variavel) {
  
  #quo_var <- sym(variavel) se a entrada for uma string, e não um nome (quosure)
  quo_var <- enquo(variavel) #se a entrada for um nome (quosure), e não uma string

  ggplot(honras_pre %>%
           group_by(!! quo_var) %>%
           summarise(valor = sum(valor)),
         aes(y = reorder(!! quo_var, valor), x = valor)) +
    geom_col()
}

plota_sumario(mutuario)
plota_sumario(Credor)
plota_sumario(tipo_divida)
plota_sumario(ano)


# verifica subtotais meses ------------------------------------------------

honras_pre %>% 
  filter(ano == 2019, mes == "08") %>% 
  mutate(total = sum(valor)) %>% 
  group_by(Credor) %>% 
  summarise(subtotal = sum(valor),
            total = first(total)) %>%
  ungroup() %>%
  mutate(pct = scales::percent(subtotal / total))

honras_pre %>% 
  filter(mutuario == "Pernambuco") %>% 
  mutate(total = sum(valor)) %>% 
  group_by(Credor) %>% 
  summarise(subtotal = sum(valor),
            total = first(total)) %>%
  ungroup() %>%
  mutate(pct = scales::percent(subtotal / total))
