FONTS_URL=https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/IosevkaTermSlab.zip
FONT_ARCHIVE=fonts/IosevkaTermSlab.zip
ORIGINAL_DIR=fonts
GENERATED_DIR=public/fonts
WHITELIST_FILE=fonts/whitelist.txt

.PHONY: all fonts clean

all: fonts copy-notes

fonts: $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Regular.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Regular.woff \
       $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Bold.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Bold.woff \
       $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Italic.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-Italic.woff \
       $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.woff2 $(GENERATED_DIR)/IosevkaTermSlabNerdFontPropo-BoldItalic.woff

$(FONT_ARCHIVE):
	@echo ">> Downloading font archive..."
	mkdir -p $(ORIGINAL_DIR)
	curl -L -o $(FONT_ARCHIVE) $(FONTS_URL)
	@echo ">> Extracting fonts..."
	unzip -o $(FONT_ARCHIVE) -d $(ORIGINAL_DIR)
	@echo ">> Creating generated fonts directory..."
	mkdir -p $(GENERATED_DIR)

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

clean:
	@echo ">> Cleaning up..."
	rm -rf $(FONT_ARCHIVE) $(ORIGINAL_DIR) $(GENERATED_DIR)