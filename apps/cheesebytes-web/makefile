IOSEVKA_URL=https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/IosevkaTermSlab.zip
IOSEVKA_ARCHIVE=fonts/IosevkaTermSlab.zip
BB_URL=https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/BigBlueTerminal.zip
BB_ARCHIVE=fonts/BigBlueTerminal.zip
ORIGINAL_DIR=fonts
GENERATED_DIR=public/fonts
WHITELIST_FILE=fonts/whitelist.txt

.PHONY: all fonts clean

all: fonts copy-notes

fonts: $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Regular.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Regular.woff \
       $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Bold.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Bold.woff \
       $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Italic.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Italic.woff \
       $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.woff \
       $(GENERATED_DIR)/BigBlueTerm437NerdFontMono-Regular.woff2 $(GENERATED_DIR)/BigBlueTerm437NerdFontMono-Regular.woff

$(IOSEVKA_ARCHIVE):
	@echo ">> Downloading IosevkaTermSlab font archive..."
	mkdir -p $(ORIGINAL_DIR)
	curl -L -o $(IOSEVKA_ARCHIVE) $(IOSEVKA_URL)
	@echo ">> Extracting fonts..."
	unzip -o $(IOSEVKA_ARCHIVE) -d $(ORIGINAL_DIR)
	@echo ">> Creating generated fonts directory..."
	mkdir -p $(GENERATED_DIR)

$(BB_ARCHIVE):
	@echo ">> Downloading BigBlueTerminal font archive..."
	mkdir -p $(ORIGINAL_DIR)
	curl -L -o $(BB_ARCHIVE) $(BB_URL)
	@echo ">> Extracting fonts..."
	unzip -o $(BB_ARCHIVE) -d $(ORIGINAL_DIR)
	@echo ">> Creating generated fonts directory..."
	mkdir -p $(GENERATED_DIR)

# TTF files are extracted from their respective archives
$(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-%.ttf: $(IOSEVKA_ARCHIVE)
	unzip -o $(IOSEVKA_ARCHIVE) -d $(ORIGINAL_DIR) $(@F)

$(ORIGINAL_DIR)/BigBlueTerm437NerdFontMono-%.ttf: $(BB_ARCHIVE)
	unzip -o $(BB_ARCHIVE) -d $(ORIGINAL_DIR) $(@F)

$(GENERATED_DIR):
	mkdir -p $@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Regular.woff2: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Regular.ttf $(GENERATED_DIR)
	@echo ">> Generating Regular font (.woff2)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Regular.ttf --text-file=$(WHITELIST_FILE) --flavor=woff2 --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Regular.woff: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Regular.ttf $(GENERATED_DIR)
	@echo ">> Generating Regular font (.woff)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Regular.ttf --text-file=$(WHITELIST_FILE) --flavor=woff --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Bold.woff2: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Bold.ttf $(GENERATED_DIR)
	@echo ">> Generating Bold font (.woff2)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Bold.ttf --text-file=$(WHITELIST_FILE) --flavor=woff2 --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Bold.woff: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Bold.ttf $(GENERATED_DIR)
	@echo ">> Generating Bold font (.woff)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Bold.ttf --text-file=$(WHITELIST_FILE) --flavor=woff --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Italic.woff2: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Italic.ttf $(GENERATED_DIR)
	@echo ">> Generating Italic font (.woff2)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Italic.ttf --text-file=$(WHITELIST_FILE) --flavor=woff2 --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Italic.woff: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Italic.ttf $(GENERATED_DIR)
	@echo ">> Generating Italic font (.woff)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-Italic.ttf --text-file=$(WHITELIST_FILE) --flavor=woff --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.woff2: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.ttf $(GENERATED_DIR)
	@echo ">> Generating Bold Italic font (.woff2)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.ttf --text-file=$(WHITELIST_FILE) --flavor=woff2 --output-file=$@

$(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.woff: $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.ttf $(GENERATED_DIR)
	@echo ">> Generating Bold Italic font (.woff)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.ttf --text-file=$(WHITELIST_FILE) --flavor=woff --output-file=$@

$(GENERATED_DIR)/BigBlueTerm437NerdFontMono-Regular.woff2: $(ORIGINAL_DIR)/BigBlueTerm437NerdFontMono-Regular.ttf $(GENERATED_DIR)
	@echo ">> Generating BigBlueTerm437 Regular font (.woff2)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/BigBlueTerm437NerdFontMono-Regular.ttf --text-file=$(WHITELIST_FILE) --flavor=woff2 --output-file=$@

$(GENERATED_DIR)/BigBlueTerm437NerdFontMono-Regular.woff: $(ORIGINAL_DIR)/BigBlueTerm437NerdFontMono-Regular.ttf $(GENERATED_DIR)
	@echo ">> Generating BigBlueTerm437 Regular font (.woff)..."
	pyftsubset --drop-tables=PfEd $(ORIGINAL_DIR)/BigBlueTerm437NerdFontMono-Regular.ttf --text-file=$(WHITELIST_FILE) --flavor=woff --output-file=$@

clean:
	@echo ">> Cleaning up..."
	rm -rf $(IOSEVKA_ARCHIVE) $(BB_ARCHIVE) $(ORIGINAL_DIR) $(GENERATED_DIR)