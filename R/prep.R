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

honras <- read.csv2("./R/relatorio_honras_atrasos.csv",
                    skip = 10, stringsAsFactors = FALSE)

names(honras) <- c("Data de Vencimento", "Tipo de Dívida", "Nome do Contrato", 
                   "Credor", "Classificação do Credor", "Mutuário", "Tipo de Mutuário", 
                   "Processo PGFN", "Status", "Data Limite da União", "Data Regularização do Atraso", 
                   "Moeda de Origem", "Total no Vencimento (Moeda de Origem)", "Honra - Principal (Moeda de Origem)", 
                   "Honra - Juros/Encargos (Moeda de Origem)", "Honra - Mora (Moeda de Origem)", 
                   "Honra - Total (Moeda de Origem)", "Honra - Principal (R$)", 
                   "Honra Juros/Encargos (R$)", "Honra - Mora (R$)", "Honra - Total (R$)", 
                   "Ano Regularização", "Mês Regularização", "X24")


# processamento inicial ---------------------------------------------------

honras_pre <- honras %>%
  select(data = `Data de Vencimento`,
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
             ",", "\\."))) %>%
  arrange(data)


# empilhamento dos valores ------------------------------------------------

# honras_stack <- honras_pre %>%
#   group_by(mutuario) %>%
#   mutate(pos_ini_mutuario = cumsum(valor) - valor)

variaveis_de_interesse <- c("mutuario", "Credor", "tipo_divida", "ano")

honras_stack <- honras_pre

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

dados %>% 
  group_by(mutuario) %>% 
  summarise(soma = sum(valor)) %>% 
  arrange(desc(soma))

sum(honras_det$valor[honras_det$mutuario=="Rio de Janeiro"]) / sum(honras_det$valor)
length(unique(honras_det$mutuario))

honras_det %>% filter(ano == 2020) %>% group_by(Credor) %>% summarise(sum(valor)) %>% arrange(desc(`sum(valor)`))

View(honras_det %>% count(data_mes))


# prototipos das viz ------------------------------------------------------

plota_sumario <- function(variavel) {
  
  quo_var <- sym(variavel)
  # quo_var <- enquo(variavel) se a entrada for um nome, e não uma string

  ggplot(honras_simples_pre %>%
           group_by(!! quo_var) %>%
           summarise(valor = sum(valor)),
         aes(y = reorder(!! quo_var, valor), x = valor)) +
    geom_col()
}

plota_sumario("mutuario")
plota_sumario(Credor)
plota_sumario(tipo_divida)
plota_sumario(ano)

honras_dupla <- honras_simples_pre %>%
  mutate(layer = 1) %>%
  bind_rows(honras_simples_pre) %>%
  mutate(layer = ifelse(is.na(layer), 2, layer))

ggplot(honras_dupla, aes(x = valor, group = paste(data, tipo_divida, Credor, mutuario))) + 
  geom_col(position = "stack", aes(y = ifelse(layer == 1, mutuario, NA))) +
  geom_col(position = "stack", aes(y = ifelse(layer == 2, Credor, NA))) +
  theme(legend.position = "none") +
  transition_states(states = layer)
