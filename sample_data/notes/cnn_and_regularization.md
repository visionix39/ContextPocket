# Convolutional Networks and Regularisation

## Why convolutions

Fully connected layers treat every input pixel independently, so they have to re-learn
the same edge detector at every position and have an enormous number of parameters. A
convolutional layer instead slides a small filter (kernel), e.g. 3×3, across the image.
The same weights are reused at every location (weight sharing), which gives translation
equivariance: a feature detected in the top-left is detected the same way bottom-right.

## Anatomy of a conv layer

- **Kernel size** sets the receptive field of one layer. Stacking two 3×3 layers covers a
  5×5 region with fewer parameters than a single 5×5 kernel.
- **Stride** is how far the filter moves each step. Stride 2 halves the spatial size.
- **Padding** adds zeros around the border so the output can keep the input's width and
  height ("same" padding) instead of shrinking ("valid" padding).
- **Channels**: a layer with 64 filters produces 64 feature maps. Each filter spans all
  input channels, so a 3×3 filter on an RGB image has 3×3×3 = 27 weights plus a bias.

## Pooling

Max pooling takes the largest value in each small window (typically 2×2), halving the
resolution while keeping the strongest activation. It adds a little translation
invariance and cuts computation. Average pooling is gentler. Many modern architectures
replace pooling with strided convolutions, and use global average pooling at the end to
collapse each feature map to a single number before the classifier.

## Classic architectures

LeNet-5 (1998) introduced the conv → pool → conv → pool → dense pattern. AlexNet (2012)
scaled it up with ReLU, dropout and GPU training and won ImageNet by a large margin.
VGG showed that depth with uniform 3×3 kernels works well. ResNet (2015) added skip
connections: each block learns a residual F(x) and outputs F(x) + x. The identity path
lets gradients flow directly to early layers, which made training 100+ layer networks
possible and solved the degradation problem where deeper plain networks trained worse.

## Overfitting

A model overfits when it fits noise in the training set and generalises poorly. The
symptom is a training loss that keeps falling while validation loss rises. Always keep a
held-out validation set for model selection and a separate test set that is touched once.

## Regularisation techniques

**L2 weight decay** adds λ‖w‖² to the loss, pulling weights toward zero and preferring
smoother functions. In Adam, decoupled weight decay (AdamW) applies the decay directly to
the weights rather than through the gradient, which works noticeably better.

**L1 regularisation** adds λ‖w‖₁ and pushes many weights to exactly zero, producing sparse
models.

**Dropout** randomly zeroes each activation with probability p (often 0.5 in dense
layers, lower in conv layers) during training. The network cannot rely on any single
neuron, so it learns redundant, more robust features. At test time dropout is switched
off and activations are scaled so their expected value matches training. Dropout can be
read as training an ensemble of exponentially many thinned networks that share weights.

**Early stopping** halts training when validation loss stops improving. It is a form of
regularisation because the number of steps limits how far weights can travel from their
initialisation.

**Data augmentation** enlarges the training set with label-preserving transformations:
random crops, flips, colour jitter, small rotations. For images it is usually the single
most effective regulariser. Mixup and CutMix blend pairs of images and their labels.

**Label smoothing** replaces hard one-hot targets with 0.9/0.1-style soft targets so the
model is not pushed to produce infinitely confident logits.

## Transfer learning

Features learned on a large dataset such as ImageNet transfer well to new tasks. Common
practice is to take a pretrained backbone, replace the final classifier, and either
freeze the backbone and train only the new head (linear probing) or fine-tune the whole
network with a small learning rate. Fine-tuning usually wins when the new dataset is
reasonably large or visually different from the pretraining data.
