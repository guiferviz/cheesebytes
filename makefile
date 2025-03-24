copy-notes:
	@if [ -z "$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)" ]; then \
		echo "Error: PATH_CHEESE_BYTES_IN_PRIVATE_VAULT must be defined."; \
		exit 1; \
	fi
	rsync -rcvh \
		--exclude .DS_Store \
		--exclude '.obsidian/*' \
		--dry-run \
		--itemize-changes \
		--delete \
		$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/ ./notes/
	
	@read -p "Proceed with actual copy? [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		rsync -rcvh \
			--exclude .DS_Store \
			--exclude '.obsidian/*' \
			--update \
			--delete \
			$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/ ./notes/; \
	else \
		echo "Aborted."; \
		exit 1; \
	fi
