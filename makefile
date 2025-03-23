copy-notes:
	@if [ -z "$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)" ]; then \
		echo "Error: PATH_CHEESE_BYTES_IN_PRIVATE_VAULT must be defined."; \
		exit 1; \
	fi
	rsync -rcvh \
		--exclude $(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/notes/.obsidian \
		--exclude .DS_Store \
		--dry-run \
		--itemize-changes \
		--update \
		$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/ ./notes/
	
	@read -p "Proceed with actual copy? [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		rsync -rcvh \
			--exclude $(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/notes/.obsidian \
			--exclude .DS_Store \
			--update \
			$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/ ./notes/; \
	else \
		echo "Aborted."; \
		exit 1; \
	fi
