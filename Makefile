.PHONY: clean_notebooks wheel install tests check_version dist check_dist upload_test upload bump release create-release docker docker_upload dist

PYCACHE := $(shell find . -name '__pycache__')
EGGS := $(wildcard *.egg-info)
CURRENT_VERSION := $(shell awk '/version/ {print substr($$2, 2, length($$2)-3)}' setup.py)

# https://github.com/jupyter/nbconvert/issues/637

clean:
	@echo "=> Cleaning"
	@rm -fr build dist $(EGGS) $(PYCACHE)

prepare: clean
	git add .
	git status
	git commit -m "cleanup before release"

# Version commands

dist:
	@echo Version: $(CURRENT_VERSION)
	@python setup.py sdist bdist_wheel
	vsce package && mv cadquery-viewer-$(CURRENT_VERSION).vsix dist/
	@ls -l dist/

release:
	git add .
	git status
	git diff-index --quiet HEAD || git commit -m "Latest release: $(CURRENT_VERSION)"
	git tag -a v$(CURRENT_VERSION) -m "Latest release: $(CURRENT_VERSION)"
	
create-release:
	@github-release release -u bernhard-42 -r vscode-cadquery-viewer -t v$(CURRENT_VERSION) -n vscode-cadquery-viewer-$(CURRENT_VERSION)
	@sleep 2
	@github-release upload  -u bernhard-42 -r vscode-cadquery-viewer -t v$(CURRENT_VERSION) -n cadquery-viewer-$(CURRENT_VERSION).vsix -f dist/cadquery-viewer-$(CURRENT_VERSION).vsix
	@github-release upload  -u bernhard-42 -r vscode-cadquery-viewer -t v$(CURRENT_VERSION) -n cq_vscode-$(CURRENT_VERSION)-py3-none-any.whl -f dist/cq_vscode-$(CURRENT_VERSION)-py3-none-any.whl 
	@github-release upload  -u bernhard-42 -r vscode-cadquery-viewer -t v$(CURRENT_VERSION) -n cq_vscode-$(CURRENT_VERSION).tar.gz -f dist/cq_vscode-$(CURRENT_VERSION).tar.gz 

# install: dist
# 	@echo "=> Installing jupyter_cadquery"
# 	@pip install --upgrade .

# check_dist:
# 	@twine check dist/*

# upload:
# 	@twine upload dist/*
