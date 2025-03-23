copy-notes:
	@if [ -z "$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)" ]; then \
		echo "Error: PATH_CHEESE_BYTES_IN_PRIVATE_VAULT must be defined."; \
		exit 1; \
	fi
	rsync -avh \
		--exclude $(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT)/notes/.obsidian \
		--update \
		$(PATH_CHEESE_BYTES_IN_PRIVATE_VAULT) ./notes/
